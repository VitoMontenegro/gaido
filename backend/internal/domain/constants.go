package domain

const (
	RoleTourist   = "ROLE_TOURIST"
	RoleGuide     = "ROLE_GUIDE"
	RoleProvider  = "ROLE_PROVIDER" // marketplace author (servis)
	RoleCarrier   = "ROLE_CARRIER"  // transport carrier (vezu)
	RoleModerator = "ROLE_MODERATOR"
	RoleAdmin     = "ROLE_ADMIN"
)

const (
	GuideTypeGuide       = "GUIDE"
	GuideTypeEntertainer = "ENTERTAINER"
	GuideTypeCompanion   = "COMPANION"
)

const (
	GuideStatusDraft          = "DRAFT"
	GuideStatusWaitingPayment = "WAITING_PAYMENT"
	GuideStatusActive         = "ACTIVE"
	GuideStatusSuspended      = "SUSPENDED"
	GuideStatusBlocked        = "BLOCKED"
	GuideStatusExpired        = "EXPIRED"
)

const (
	SubscriptionActive  = "ACTIVE"
	SubscriptionExpired = "EXPIRED"
	SubscriptionPending = "PENDING"
)

const (
	PaymentPurposeGuidePlacement    = "GUIDE_PLACEMENT"
	PaymentPurposeFeaturedGuide     = "FEATURED_GUIDE"
	PaymentPurposeFeaturedExcursion = "FEATURED_EXCURSION"
	PaymentPaid                     = "PAID"
	PaymentPending                  = "PENDING"
	PaymentCreated                  = "CREATED"
)

const (
	PlanTypeGuidePlacement    = "GUIDE_PLACEMENT"
	PlanTypeFeaturedGuide     = "FEATURED_GUIDE"
	PlanTypeFeaturedExcursion = "FEATURED_EXCURSION"
)

const (
	FeaturedSlotGuide     = "FEATURED_GUIDE"
	FeaturedSlotExcursion = "FEATURED_EXCURSION"
)

const (
	FeaturedPlacementActive  = "ACTIVE"
	FeaturedPlacementExpired = "EXPIRED"
)

const (
	ActivationPayment     = "PAYMENT"
	ActivationAdminBypass = "ADMIN_BYPASS"
)

const (
	ExcursionPublished         = "PUBLISHED"
	ExcursionDraft             = "DRAFT"
	ExcursionPendingModeration = "PENDING_MODERATION"
	ExcursionRejected          = "REJECTED"
)

const (
	ReviewPublished = "PUBLISHED"
	ReviewPending   = "PENDING"
)

const (
	ReviewDisputeOpen     = "OPEN"
	ReviewDisputeResolved = "RESOLVED"
)

const (
	TransportKindRegular    = "regular"
	TransportKindOccasional = "occasional"
)

const (
	CarrierTypeCompany    = "company"
	CarrierTypeFOP        = "fop"
	CarrierTypePrivate    = "private"
	CarrierTypeIndividual = "individual"
)

const (
	CarrierStatusDraft     = "draft"
	CarrierStatusPending   = "pending"
	CarrierStatusPublished = "published"
	CarrierStatusSuspended = "suspended"
)

const (
	VerificationPending  = "pending"
	VerificationVerified = "verified"
	VerificationRejected = "rejected"
)

const (
	CarrierTrustNew      = "new"
	CarrierTrustVerified = "verified"
	CarrierTrustTrusted  = "trusted"
)

const (
	TransportListingDraft     = "draft"
	TransportListingPending   = "pending"
	TransportListingPublished = "published"
	TransportListingRejected  = "rejected"
)

const (
	TransportBookingPending   = "pending"
	TransportBookingConfirmed = "confirmed"
	TransportBookingCancelled = "cancelled"
	TransportBookingCompleted = "completed"
)

const (
	ArticlePublished = "PUBLISHED"
	ArticleDraft     = "DRAFT"
)

const (
	DocTypeGuideLicense       = "GUIDE_LICENSE"
	DocTypeEntertainerLicense = "ENTERTAINER_LICENSE"
)

const (
	FavoriteGuide     = "GUIDE"
	FavoriteExcursion = "EXCURSION"
)

const MaxGuestsCap = 100

// Provider platform
const (
	ProviderStatusNew        = "new"
	ProviderStatusModeration = "moderation"
	ProviderStatusVerified   = "verified"
	ProviderStatusNeedInfo   = "need_info"
	ProviderStatusBlocked    = "blocked"
)

const (
	ComplaintStatusOpen      = "open"
	ComplaintStatusResolved  = "resolved"
	ComplaintStatusDismissed = "dismissed"
)

const (
	OfferingStatusDraft     = "draft"
	OfferingStatusPublished = "published"
	OfferingStatusRejected  = "rejected"
)

const (
	FormatOnSite = "on_site"
	FormatMobile = "mobile"
	FormatOnline = "online"
)

const (
	ZoneKindServiceArea = "service_area"
	ZoneKindTransport   = "transport"
)

const (
	ZoneTypeCity         = "city"
	ZoneTypeNearbyCities = "nearby_cities"
	ZoneTypeDistrict     = "district"
	ZoneTypeRadius       = "radius"
	ZoneTypeRegion       = "region"
	ZoneTypeCitySuburbs  = "city_suburbs"
	ZoneTypeIntercity    = "intercity"
)

const (
	AddressExact       = "exact"
	AddressDistrict    = "district"
	AddressApproximate = "approximate"
	AddressHidden      = "hidden"
)

const (
	DocStatusUnchecked = "unchecked"
	DocStatusInReview  = "in_review"
	DocStatusVerified  = "verified"
	DocStatusExpired   = "expired"
)

const (
	ResponseUnder30m  = "under_30m"
	ResponseUnder1h   = "under_1h"
	ResponseFewHours  = "few_hours"
	ResponseWithin24h = "within_24h"
	Response1_2Days   = "1_2_days"
)

const (
	ReviewTargetOffering = "offering"
	ReviewTargetProvider = "provider"
)

const (
	PlanTypeProviderPlacement       = "PROVIDER_PLACEMENT"
	PaymentPurposeProviderPlacement = "PROVIDER_PLACEMENT"
)

const FavoriteProvider = "PROVIDER"

func ValidProviderStatus(s string) bool {
	switch s {
	case ProviderStatusNew, ProviderStatusModeration, ProviderStatusVerified, ProviderStatusNeedInfo, ProviderStatusBlocked:
		return true
	default:
		return false
	}
}

func ValidOfferingStatus(s string) bool {
	switch s {
	case OfferingStatusDraft, OfferingStatusPublished, OfferingStatusRejected:
		return true
	default:
		return false
	}
}

func ValidComplaintStatus(s string) bool {
	switch s {
	case ComplaintStatusOpen, ComplaintStatusResolved, ComplaintStatusDismissed:
		return true
	default:
		return false
	}
}
