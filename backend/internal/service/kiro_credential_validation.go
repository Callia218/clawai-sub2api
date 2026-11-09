package service

import (
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/kiro"
)

func validateKiroRegionCredentials(credentials map[string]any) error {
	value, exists := credentials["region"]
	if !exists {
		return nil
	}
	region, ok := value.(string)
	if !ok {
		return infraerrors.BadRequest("KIRO_INVALID_REGION", "Kiro region must be a string")
	}
	if _, err := kiro.NormalizeRegion(region); err != nil {
		return infraerrors.BadRequest("KIRO_INVALID_REGION", err.Error())
	}
	return nil
}
