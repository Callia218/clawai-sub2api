// security-verify exercises billing and auth against a disposable database copy.
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"strings"
	"sync"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	dbent "github.com/Wei-Shaw/sub2api/ent"
	_ "github.com/Wei-Shaw/sub2api/ent/runtime"
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/repository"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

func check(err error) {
	if err != nil {
		panic(err)
	}
}
func assert(ok bool, msg string) {
	if !ok {
		panic(msg)
	}
}

func main() {
	ctx := context.Background()
	dsn := os.Getenv("SECURITY_TEST_DSN")
	assert(strings.Contains(dsn, "dbname=sub2api_security_test"), "dedicated database is required")
	db, err := sql.Open("postgres", dsn)
	check(err)
	defer db.Close()
	db.SetMaxOpenConns(24)
	check(db.PingContext(ctx))
	check(repository.ApplyMigrations(ctx, db))
	client := dbent.NewClient(dbent.Driver(entsql.OpenDB(dialect.Postgres, db)))
	rdb := redis.NewClient(&redis.Options{Addr: os.Getenv("SECURITY_TEST_REDIS"), MaxRetries: -1})
	defer rdb.Close()
	check(rdb.Ping(ctx).Err())
	cfg := &config.Config{JWT: config.JWTConfig{Secret: "isolated-test-signing-key", ExpireHour: 1, RefreshTokenExpireDays: 1, RequireIssuedToken: true}}
	cfg.Billing.InflightReservation = config.InflightReservationConfig{Enabled: true, TTLSeconds: 3, FailClosedOnUnpriced: true}
	users := repository.NewUserRepository(client, db)
	subs := repository.NewUserSubscriptionRepository(client)
	cache := repository.NewBillingCache(rdb)
	billing := service.NewBillingCacheService(cache, users, subs, nil, nil, nil, cfg, nil)
	defer billing.Stop()
	settlement := repository.NewUsageBillingRepository(client, db)
	report := map[string]any{"migration": "passed on production database copy"}
	for _, mode := range []string{"daily", "weekly", "monthly", "balance"} {
		var uid, gid, sid, kid int64
		budget := 0.1
		if mode == "balance" {
			budget = 0.078
		}
		check(db.QueryRowContext(ctx, "INSERT INTO users(email,password_hash,balance,status) VALUES($1,'test-only',$2,'active') RETURNING id", "security-"+uuid.NewString()+"@test.invalid", budget).Scan(&uid))
		var group *service.Group
		var sub *service.UserSubscription
		if mode != "balance" {
			column := mode + "_limit_usd"
			check(db.QueryRowContext(ctx, "INSERT INTO groups(name,subscription_type,"+column+") VALUES($1,'subscription',$2) RETURNING id", "security-"+uuid.NewString(), budget).Scan(&gid))
			check(db.QueryRowContext(ctx, "INSERT INTO user_subscriptions(user_id,group_id,starts_at,expires_at,daily_window_start,weekly_window_start,monthly_window_start) VALUES($1,$2,now(),now()+interval '30 days',now(),now(),now()) RETURNING id", uid, gid).Scan(&sid))
			group = &service.Group{ID: gid, SubscriptionType: service.SubscriptionTypeSubscription}
			switch mode {
			case "daily":
				group.DailyLimitUSD = &budget
			case "weekly":
				group.WeeklyLimitUSD = &budget
			case "monthly":
				group.MonthlyLimitUSD = &budget
			}
			sub = &service.UserSubscription{ID: sid}
		}
		check(db.QueryRowContext(ctx, "INSERT INTO api_keys(user_id,key,name) VALUES($1,$2,'security-test') RETURNING id", uid, "sk-test-"+uuid.NewString()).Scan(&kid))
		user, err := users.GetByID(ctx, uid)
		check(err)
		check(cache.SetUserBalance(ctx, uid, budget))
		const n = 20
		start := make(chan struct{})
		held := make(chan *service.InflightReservation, n)
		var wg sync.WaitGroup
		for i := 0; i < n; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				<-start
				r, e := billing.ReserveGatewayCharge(ctx, user, nil, group, sub, 0.078)
				if e == nil {
					held <- r
				}
			}()
		}
		close(start)
		wg.Wait()
		close(held)
		assert(len(held) == 1, fmt.Sprintf("%s admitted=%d expected=1", mode, len(held)))
		for r := range held {
			finish := r.Acquire()
			r.HandlerDone()
			if mode == "daily" {
				time.Sleep(4 * time.Second)
			}
			_, err = billing.ReserveGatewayCharge(ctx, user, nil, group, sub, 0.078)
			assert(err != nil, "pending settlement reopened quota")
			cmd := &service.UsageBillingCommand{RequestID: uuid.NewString(), APIKeyID: kid, UserID: uid}
			if mode == "balance" {
				cmd.BalanceCost = 0.078
			} else {
				cmd.SubscriptionCost = 0.078
				cmd.SubscriptionID = &sid
			}
			result, e := settlement.Apply(ctx, cmd)
			check(e)
			assert(result.Applied, "settlement must apply")
			again, e := settlement.Apply(ctx, cmd)
			check(e)
			assert(!again.Applied, "duplicate charge must not apply")
			finish()
		}
		_, err = billing.ReserveGatewayCharge(ctx, user, nil, group, sub, 0.078)
		assert(err != nil, "settled request allowed overspending from stale cache")
		var value float64
		if mode == "balance" {
			check(db.QueryRowContext(ctx, "SELECT balance FROM users WHERE id=$1", uid).Scan(&value))
			assert(math.Abs(value) < 1e-9, "balance must be zero")
		} else {
			check(db.QueryRowContext(ctx, "SELECT daily_usage_usd FROM user_subscriptions WHERE id=$1", sid).Scan(&value))
			assert(math.Abs(value-0.078) < 1e-9, "quota must be charged exactly once")
		}
		report[mode] = map[string]any{"concurrent": n, "admitted": 1, "rejected": 19, "stored_value": value, "async_hold": "passed", "stale_cache": "rejected", "idempotency": "passed"}
	}
	var uid, kid int64
	check(db.QueryRowContext(ctx, "INSERT INTO users(email,password_hash,balance) VALUES($1,'test-only',0.01) RETURNING id", "debt-"+uuid.NewString()+"@test.invalid").Scan(&uid))
	check(db.QueryRowContext(ctx, "INSERT INTO api_keys(user_id,key,name) VALUES($1,$2,'debt-test') RETURNING id", uid, "sk-"+uuid.NewString()).Scan(&kid))
	_, err = settlement.Apply(ctx, &service.UsageBillingCommand{RequestID: uuid.NewString(), APIKeyID: kid, UserID: uid, BalanceCost: 0.02})
	check(err)
	var balance float64
	var status string
	check(db.QueryRowContext(ctx, "SELECT balance,status FROM users WHERE id=$1", uid).Scan(&balance, &status))
	assert(status == "disabled" && math.Abs(balance+0.01) < 1e-9, "unexpected actual cost must record debt and disable account")
	report["underestimated_cost"] = map[string]any{"status": status, "debt_recorded": balance}
	refresh := repository.NewRefreshTokenCache(rdb)
	auth := service.NewAuthService(client, users, nil, refresh, cfg, nil, nil, nil, nil, nil, nil, nil, nil)
	user := &service.User{ID: uid, Email: "test@test.invalid", Role: service.RoleAdmin, PasswordHash: "test"}
	pair, err := auth.GenerateTokenPair(ctx, user, "")
	check(err)
	claims, err := auth.ValidateToken(pair.AccessToken)
	check(err)
	for _, binding := range []string{"", "attacker-binding"} {
		fake := *claims
		fake.SessionID = "deadbeefcafe0001"
		fake.BindingHash = binding
		forged, e := jwt.NewWithClaims(jwt.SigningMethodHS256, &fake).SignedString([]byte(cfg.JWT.Secret))
		check(e)
		_, e = auth.ValidateToken(forged)
		assert(e != nil, "forged admin must be rejected")
	}
	check(auth.RevokeRefreshToken(ctx, pair.RefreshToken))
	_, err = auth.ValidateToken(pair.AccessToken)
	assert(err != nil, "logout must revoke access token")
	report["jwt"] = map[string]any{"issued_pair": "accepted", "forged_signed_empty_binding": "rejected", "forged_signed_nonempty_binding": "rejected", "logout": "revoked"}
	check(rdb.Close())
	_, err = auth.GenerateToken(ctx, user)
	assert(err != nil, "cache outage must fail closed")
	report["auth_cache_outage"] = "rejected"
	check(json.NewEncoder(os.Stdout).Encode(report))
}
