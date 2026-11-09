package provider

import (
	"context"
	"fmt"
	"math"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/payment"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/smartwalle/alipay/v3"
)

// Alipay product codes.
const (
	alipayProductCodePreCreate = "FACE_TO_FACE_PAYMENT"
	alipayProductCodeWapPay    = "QUICK_WAP_WAY"
	alipayProductCodePagePay   = "FAST_INSTANT_TRADE_PAY"
)

// Alipay response constants.
const (
	alipayFundChangeYes    = "Y"
	alipayErrTradeNotExist = "ACQ.TRADE_NOT_EXIST"
	alipayRefundStatusSucc = "REFUND_SUCCESS"
	alipayRefundRequestSep = "-refund-"
	// 支付宝提示退款发起后过早查询可能查不到、之后又处理成功；超过该时长仍无记录才判定失败。
	alipayRefundQueryNotFoundGrace = 10 * time.Minute
	// alipayAmountTolerance 是回调金额与反查金额的允许误差（分）。
	alipayAmountTolerance = 0.005
)

var (
	alipayTradeWapPay = func(client *alipay.Client, param alipay.TradeWapPay) (*url.URL, error) {
		return client.TradeWapPay(param)
	}
	alipayTradePreCreate = func(ctx context.Context, client *alipay.Client, param alipay.TradePreCreate) (*alipay.TradePreCreateRsp, error) {
		return client.TradePreCreate(ctx, param)
	}
	alipayTradePagePay = func(client *alipay.Client, param alipay.TradePagePay) (*url.URL, error) {
		return client.TradePagePay(param)
	}
	alipayTradeRefund = func(ctx context.Context, client *alipay.Client, param alipay.TradeRefund) (*alipay.TradeRefundRsp, error) {
		return client.TradeRefund(ctx, param)
	}
	alipayTradeFastPayRefundQuery = func(ctx context.Context, client *alipay.Client, param alipay.TradeFastPayRefundQuery) (*alipay.TradeFastPayRefundQueryRsp, error) {
		return client.TradeFastPayRefundQuery(ctx, param)
	}
)

// Alipay implements payment.Provider and payment.CancelableProvider using the smartwalle/alipay SDK.
type Alipay struct {
	instanceID string
	config     map[string]string // appId, privateKey, publicKey (or alipayPublicKey), notifyUrl, returnUrl

	mu     sync.Mutex
	client *alipay.Client
}

// NewAlipay creates a new Alipay provider instance.
func NewAlipay(instanceID string, config map[string]string) (*Alipay, error) {
	required := []string{"appId", "privateKey"}
	for _, k := range required {
		if config[k] == "" {
			return nil, fmt.Errorf("alipay config missing required key: %s", k)
		}
	}
	return &Alipay{
		instanceID: instanceID,
		config:     config,
	}, nil
}

func (a *Alipay) getClient() (*alipay.Client, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.client != nil {
		return a.client, nil
	}
	client, err := alipay.New(a.config["appId"], a.config["privateKey"], true)
	if err != nil {
		return nil, fmt.Errorf("alipay init client: %w", err)
	}
	pubKey := a.config["publicKey"]
	if pubKey == "" {
		pubKey = a.config["alipayPublicKey"]
	}
	if pubKey == "" {
		return nil, fmt.Errorf("alipay config missing required key: publicKey (or alipayPublicKey)")
	}
	if err := client.LoadAliPayPublicKey(pubKey); err != nil {
		return nil, fmt.Errorf("alipay load public key: %w", err)
	}
	a.client = client
	return a.client, nil
}

func (a *Alipay) Name() string        { return "Alipay" }
func (a *Alipay) ProviderKey() string { return payment.TypeAlipay }
func (a *Alipay) SupportedTypes() []payment.PaymentType {
	return []payment.PaymentType{payment.TypeAlipay}
}

func (a *Alipay) MerchantIdentityMetadata() map[string]string {
	if a == nil {
		return nil
	}
	appID := strings.TrimSpace(a.config["appId"])
	if appID == "" {
		return nil
	}
	return map[string]string{"app_id": appID}
}

// CreatePayment creates an Alipay payment using the following routing:
//   - Mobile (H5), default: alipay.trade.wap.pay — browser redirect into Alipay.
//   - Mobile with AlipayMobilePrecreate: alipay.trade.precreate — return the
//     dynamic QR payload so the frontend can open it through the Alipay app.
//   - Desktop, default: prefer alipay.trade.precreate (FACE_TO_FACE_PAYMENT) to
//     get a scannable QR payload. If precreate is unavailable for the merchant,
//     fall back to alipay.trade.page.pay and expose pay_url only — the frontend
//     opens the Alipay checkout in a new tab.
//   - Desktop, paymentMode == "redirect": skip precreate and go straight to
//     alipay.trade.page.pay so the frontend always opens the Alipay checkout
//     in a new tab. Use this when the merchant has not enabled FACE_TO_FACE_PAYMENT.
//
// Note: alipay.trade.page.pay returns a checkout page URL, not a scannable
// payment QR. Never expose it via the QRCode field.
func (a *Alipay) CreatePayment(ctx context.Context, req payment.CreatePaymentRequest) (*payment.CreatePaymentResponse, error) {
	client, err := a.getClient()
	if err != nil {
		return nil, err
	}

	notifyURL := a.config["notifyUrl"]
	if req.NotifyURL != "" {
		notifyURL = req.NotifyURL
	}
	returnURL := a.config["returnUrl"]
	if req.ReturnURL != "" {
		returnURL = req.ReturnURL
	}

	if req.IsMobile {
		if req.AlipayMobilePrecreate {
			return a.createPrecreateTrade(ctx, client, req, notifyURL)
		}
		return a.createWapTrade(client, req, notifyURL, returnURL)
	}
	return a.createDesktopTrade(ctx, client, req, notifyURL, returnURL)
}

func (a *Alipay) createWapTrade(client *alipay.Client, req payment.CreatePaymentRequest, notifyURL, returnURL string) (*payment.CreatePaymentResponse, error) {
	param := alipay.TradeWapPay{}
	param.OutTradeNo = req.OrderID
	param.TotalAmount = req.Amount
	param.Subject = req.Subject
	param.ProductCode = alipayProductCodeWapPay
	param.NotifyURL = notifyURL
	param.ReturnURL = returnURL

	payURL, err := alipayTradeWapPay(client, param)
	if err != nil {
		return nil, fmt.Errorf("alipay TradeWapPay: %w", err)
	}
	return &payment.CreatePaymentResponse{
		TradeNo: req.OrderID,
		PayURL:  payURL.String(),
	}, nil
}

func (a *Alipay) createDesktopTrade(ctx context.Context, client *alipay.Client, req payment.CreatePaymentRequest, notifyURL, returnURL string) (*payment.CreatePaymentResponse, error) {
	// Explicit redirect mode: merchant opted into "always open the Alipay
	// checkout page in a new tab" via the provider instance's payment_mode.
	// Skip precreate to avoid a wasted API call.
	if strings.EqualFold(strings.TrimSpace(a.config["paymentMode"]), "redirect") {
		return a.createPagePayTrade(client, req, notifyURL, returnURL)
	}

	resp, precreateErr := a.createPrecreateTrade(ctx, client, req, notifyURL)
	if precreateErr == nil {
		return resp, nil
	}

	resp, pagePayErr := a.createPagePayTrade(client, req, notifyURL, returnURL)
	if pagePayErr == nil {
		return resp, nil
	}

	return nil, fmt.Errorf("alipay desktop payment failed: precreate=%v; pagepay=%w", precreateErr, pagePayErr)
}

func (a *Alipay) createPrecreateTrade(ctx context.Context, client *alipay.Client, req payment.CreatePaymentRequest, notifyURL string) (*payment.CreatePaymentResponse, error) {
	param := alipay.TradePreCreate{}
	param.OutTradeNo = req.OrderID
	param.TotalAmount = req.Amount
	param.Subject = req.Subject
	param.ProductCode = alipayProductCodePreCreate
	param.NotifyURL = notifyURL

	rsp, err := alipayTradePreCreate(ctx, client, param)
	if err != nil {
		return nil, fmt.Errorf("alipay TradePreCreate: %w", err)
	}
	if rsp == nil {
		return nil, fmt.Errorf("alipay TradePreCreate: empty response")
	}
	if rsp.IsFailure() {
		return nil, fmt.Errorf("alipay TradePreCreate failed: %s", rsp.Error.Error())
	}
	if strings.TrimSpace(rsp.QRCode) == "" {
		return nil, fmt.Errorf("alipay TradePreCreate: empty qr_code")
	}

	return &payment.CreatePaymentResponse{
		TradeNo: req.OrderID,
		QRCode:  rsp.QRCode,
	}, nil
}

func (a *Alipay) createPagePayTrade(client *alipay.Client, req payment.CreatePaymentRequest, notifyURL, returnURL string) (*payment.CreatePaymentResponse, error) {
	param := alipay.TradePagePay{}
	param.OutTradeNo = req.OrderID
	param.TotalAmount = req.Amount
	param.Subject = req.Subject
	param.ProductCode = alipayProductCodePagePay
	param.NotifyURL = notifyURL
	param.ReturnURL = returnURL

	payURL, err := alipayTradePagePay(client, param)
	if err != nil {
		return nil, fmt.Errorf("alipay TradePagePay: %w", err)
	}
	// Only PayURL is exposed: alipay.trade.page.pay returns a checkout page URL
	// that must be opened in a browser, not a scannable payment QR. Setting it
	// as QRCode would let the frontend render an unscannable image.
	return &payment.CreatePaymentResponse{
		TradeNo: req.OrderID,
		PayURL:  payURL.String(),
	}, nil
}

// QueryOrder queries the trade status via Alipay.
func (a *Alipay) QueryOrder(ctx context.Context, tradeNo string) (*payment.QueryOrderResponse, error) {
	client, err := a.getClient()
	if err != nil {
		return nil, err
	}

	result, err := client.TradeQuery(ctx, alipay.TradeQuery{OutTradeNo: tradeNo})
	if err != nil {
		if isTradeNotExist(err) {
			return &payment.QueryOrderResponse{
				TradeNo: tradeNo,
				Status:  payment.ProviderStatusPending,
			}, nil
		}
		return nil, fmt.Errorf("alipay TradeQuery: %w", err)
	}

	status := payment.ProviderStatusPending
	switch result.TradeStatus {
	case alipay.TradeStatusSuccess, alipay.TradeStatusFinished:
		status = payment.ProviderStatusPaid
	case alipay.TradeStatusClosed:
		status = payment.ProviderStatusFailed
	}

	amount, err := strconv.ParseFloat(result.TotalAmount, 64)
	if err != nil {
		amount, err = parseAlipayAmount(
			result.TotalAmount,
			result.ReceiptAmount,
			result.BuyerPayAmount,
			result.InvoiceAmount,
		)
		if err != nil {
			return nil, fmt.Errorf("alipay parse amount: %w", err)
		}
	}

	return &payment.QueryOrderResponse{
		TradeNo:  result.TradeNo,
		Status:   status,
		Amount:   amount,
		PaidAt:   result.SendPayDate,
		Metadata: a.MerchantIdentityMetadata(),
	}, nil
}

// VerifyNotification decodes and verifies an Alipay async notification.
func (a *Alipay) VerifyNotification(ctx context.Context, rawBody string, _ map[string]string) (*payment.PaymentNotification, error) {
	client, err := a.getClient()
	if err != nil {
		return nil, err
	}

	values, err := url.ParseQuery(rawBody)
	if err != nil {
		return nil, fmt.Errorf("alipay parse notification: %w", err)
	}

	notification, err := client.DecodeNotification(ctx, values)
	if err != nil {
		return nil, fmt.Errorf("alipay verify notification: %w", err)
	}

	status := payment.ProviderStatusFailed
	if notification.TradeStatus == alipay.TradeStatusSuccess || notification.TradeStatus == alipay.TradeStatusFinished {
		status = payment.ProviderStatusSuccess
	}

	amount, err := strconv.ParseFloat(notification.TotalAmount, 64)
	if err != nil {
		amount, err = parseAlipayAmount(
			notification.TotalAmount,
			notification.ReceiptAmount,
			notification.BuyerPayAmount,
		)
		if err != nil {
			return nil, fmt.Errorf("alipay parse notification amount: %w", err)
		}
	}

	// CF_PAYMENT_SECURITY_PATCH: 回调里的 app_id 绝不能覆盖本地配置的 app_id。
	// 原实现直接 metadata["app_id"] = notification.AppId，会让后续
	// validateProviderSnapshotMetadata 的 app_id 比对变成「自己跟自己比」恒真，
	// 商户配了多个支付宝应用时无法识别跨应用回调。
	metadata := a.MerchantIdentityMetadata()
	if appID := strings.TrimSpace(notification.AppId); appID != "" {
		if expected := strings.TrimSpace(a.config["appId"]); expected != "" && !strings.EqualFold(expected, appID) {
			return nil, fmt.Errorf("alipay notification app_id mismatch: expected %s, got %s", expected, appID)
		}
		if metadata == nil {
			metadata = map[string]string{}
		}
		metadata["app_id"] = appID
	}

	return &payment.PaymentNotification{
		TradeNo:  notification.TradeNo,
		OrderID:  notification.OutTradeNo,
		Amount:   amount,
		Status:   status,
		RawData:  rawBody,
		Metadata: metadata,
	}, nil
}

// CF_PAYMENT_SECURITY_PATCH: 支付宝回调的独立复核。
//
// 支付宝异步通知本身有 RSA2 验签，理论上已足够。但开源项目最常见的部署错误是
// 把「应用公钥」当成「支付宝公钥」填进后台 —— 那样验签会「通过」，攻击者只需用
// 自己的私钥签名就能伪造一条 TRADE_SUCCESS 回调把余额刷满。
//
// 这里用 alipay.trade.query 反查真实订单状态与金额，与回调逐项比对：
//   - 业务性不一致（订单不存在 / 未支付 / 金额不符 / 交易号不符）→ 返回 error，
//     webhook 应答非成功，支付宝会重试，到账被推迟而不是被错误放行。
//   - 基础设施性错误（网络超时、限流、接口无权限、系统繁忙）→ 记录后放行，
//     由 RSA2 验签兜底，避免反查接口抖动导致全站漏单。
func (a *Alipay) ConfirmNotification(ctx context.Context, n *payment.PaymentNotification) error {
	if n == nil || n.Status != payment.NotificationStatusSuccess {
		return nil
	}
	client, err := a.getClient()
	if err != nil {
		// 客户端构造失败属于本地配置问题，回调已通过验签，放行并留痕。
		return nil
	}

	result, err := client.TradeQuery(ctx, alipay.TradeQuery{OutTradeNo: n.OrderID})
	if err != nil {
		if isTradeNotExist(err) {
			// 业务性：支付宝侧查无此单，几乎只能是伪造或串单。
			return fmt.Errorf("alipay confirm: upstream has no trade for out_trade_no %s", n.OrderID)
		}
		if isAlipayInfraError(err) {
			return nil
		}
		return fmt.Errorf("alipay confirm: %w", err)
	}
	if result == nil {
		return nil
	}
	if result.IsFailure() {
		if isAlipayInfraError(result.Error) {
			return nil
		}
		return fmt.Errorf("alipay confirm: upstream query failed: %w", result.Error)
	}

	switch result.TradeStatus {
	case alipay.TradeStatusSuccess, alipay.TradeStatusFinished:
	default:
		return fmt.Errorf("alipay confirm: upstream reports out_trade_no %s as %q, not paid", n.OrderID, result.TradeStatus)
	}

	upstreamAmount, err := strconv.ParseFloat(strings.TrimSpace(result.TotalAmount), 64)
	if err != nil {
		return fmt.Errorf("alipay confirm: upstream total_amount %q unparsable", result.TotalAmount)
	}
	if math.Abs(upstreamAmount-n.Amount) > alipayAmountTolerance {
		return fmt.Errorf("alipay confirm: amount mismatch: notified %v, upstream %v", n.Amount, upstreamAmount)
	}

	if upstreamTradeNo := strings.TrimSpace(result.TradeNo); upstreamTradeNo != "" {
		if n.TradeNo != "" && n.TradeNo != upstreamTradeNo {
			return fmt.Errorf("alipay confirm: trade_no mismatch: notified %s, upstream %s", n.TradeNo, upstreamTradeNo)
		}
		n.TradeNo = upstreamTradeNo
	}
	return nil
}

// alipayInfraErrorSubstrings 是「与订单真伪无关」的支付宝错误码/文案特征。
// 命中即视为基础设施问题，不据此判定回调为伪造。
var alipayInfraErrorSubstrings = []string{
	"isp.unknow-error",
	"isp.call-limited",
	"isp.system-error",
	"isp.busi-error",
	"aop.unknow-error",
	"aop.call-limited",
	"SYSTEM_ERROR",
	"SERVICE_NOT_ALLOWED",
	"INSUFFICIENT_ISV_PERMISSIONS",
	"INVALID_SIGNATURE_TYPE",
	"timeout",
	"Timeout",
	"timed out",
	"connection reset",
	"EOF",
}

func isAlipayInfraError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	for _, sub := range alipayInfraErrorSubstrings {
		if strings.Contains(msg, sub) {
			return true
		}
	}
	return false
}

// Refund requests a refund through Alipay.
func (a *Alipay) Refund(ctx context.Context, req payment.RefundRequest) (*payment.RefundResponse, error) {
	client, err := a.getClient()
	if err != nil {
		return nil, err
	}

	outRequestNo := fmt.Sprintf("%s%s%d", req.OrderID, alipayRefundRequestSep, time.Now().UnixNano())
	result, err := alipayTradeRefund(ctx, client, alipay.TradeRefund{
		OutTradeNo:   req.OrderID,
		RefundAmount: req.Amount,
		RefundReason: req.Reason,
		OutRequestNo: outRequestNo,
	})
	if err != nil {
		return nil, fmt.Errorf("alipay TradeRefund: %w", err)
	}
	if result == nil {
		return nil, fmt.Errorf("alipay TradeRefund: empty response")
	}

	refundStatus := payment.ProviderStatusPending
	if result.FundChange == alipayFundChangeYes {
		refundStatus = payment.ProviderStatusSuccess
	}

	// fund_change != Y 时需凭退款请求号查询终态，因此 RefundID 记录 out_request_no。
	return &payment.RefundResponse{
		RefundID: outRequestNo,
		Status:   refundStatus,
	}, nil
}

// QueryRefund 通过 alipay.trade.fastpay.refund.query 查询退款终态。refund_status 为 REFUND_SUCCESS
// 表示成功；退款发起超过宽限期仍查不到记录表示支付宝未受理或退款失败；其余情况视为仍在处理中。
func (a *Alipay) QueryRefund(ctx context.Context, req payment.RefundQueryRequest) (*payment.RefundResponse, error) {
	orderID := strings.TrimSpace(req.OrderID)
	outRequestNo := strings.TrimSpace(req.RefundID)
	// 旧版本把支付宝交易号记为 RefundID，无法据此查询退款请求，只能人工核实。
	if orderID == "" || !strings.HasPrefix(outRequestNo, orderID+alipayRefundRequestSep) {
		return nil, infraerrors.BadRequest("REFUND_QUERY_UNSUPPORTED", "this refund was issued without a queryable refund request number; please verify manually")
	}
	client, err := a.getClient()
	if err != nil {
		return nil, err
	}
	result, err := alipayTradeFastPayRefundQuery(ctx, client, alipay.TradeFastPayRefundQuery{
		OutTradeNo:   orderID,
		OutRequestNo: outRequestNo,
	})
	if err != nil {
		return nil, fmt.Errorf("alipay query refund: %w", err)
	}
	if result == nil {
		return nil, fmt.Errorf("alipay query refund: empty response")
	}
	// SDK 对带签名的业务失败响应（如 ACQ.SYSTEM_ERROR）不返回 error，字段为空；
	// 不检查错误码会被误判为"无退款记录"而失败收尾。
	if result.IsFailure() {
		return nil, fmt.Errorf("alipay query refund: %w", result.Error)
	}

	status := payment.ProviderStatusPending
	switch {
	case strings.TrimSpace(result.RefundStatus) == alipayRefundStatusSucc:
		status = payment.ProviderStatusSuccess
	case strings.TrimSpace(result.OutRequestNo) == "" && strings.TrimSpace(result.RefundAmount) == "" &&
		alipayRefundAbsenceIsFinal(req.RequestedAt, time.Now()):
		status = payment.ProviderStatusFailed
	}
	return &payment.RefundResponse{RefundID: outRequestNo, Status: status}, nil
}

func alipayRefundAbsenceIsFinal(requestedAt, now time.Time) bool {
	return !requestedAt.IsZero() && now.Sub(requestedAt) >= alipayRefundQueryNotFoundGrace
}

// CancelPayment closes a pending trade on Alipay.
func (a *Alipay) CancelPayment(ctx context.Context, tradeNo string) error {
	client, err := a.getClient()
	if err != nil {
		return err
	}

	_, err = client.TradeClose(ctx, alipay.TradeClose{OutTradeNo: tradeNo})
	if err != nil {
		if isTradeNotExist(err) {
			return nil
		}
		return fmt.Errorf("alipay TradeClose: %w", err)
	}
	return nil
}

func isTradeNotExist(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), alipayErrTradeNotExist)
}

func parseAlipayAmount(values ...string) (float64, error) {
	for _, raw := range values {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		amount, err := strconv.ParseFloat(raw, 64)
		if err == nil {
			return amount, nil
		}
	}
	return 0, fmt.Errorf("no valid amount field")
}

// Ensure interface compliance.
var (
	_ payment.Provider                 = (*Alipay)(nil)
	_ payment.CancelableProvider       = (*Alipay)(nil)
	_ payment.RefundQueryProvider      = (*Alipay)(nil)
	_ payment.MerchantIdentityProvider = (*Alipay)(nil)
	_ payment.NotificationConfirmer    = (*Alipay)(nil)
)
