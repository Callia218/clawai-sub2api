package kiro

import (
	"errors"
	"regexp"
	"strings"
)

// Region values become DNS labels in credential-bearing requests. Accept AWS
// region syntax only; URL delimiters must never influence the destination host.
var regionPattern = regexp.MustCompile(`^[a-z]{2}(?:-[a-z]+)+-[0-9]+$`)

func NormalizeRegion(region string) (string, error) {
	region = strings.ToLower(strings.TrimSpace(region))
	if region == "" {
		return defaultRegion, nil
	}
	if len(region) > 63 || !regionPattern.MatchString(region) {
		return "", errors.New("kiro: invalid AWS region")
	}
	return region, nil
}
