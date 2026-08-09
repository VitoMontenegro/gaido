package domain

const (
	RoleTourist   = "ROLE_TOURIST"
	RoleGuide     = "ROLE_GUIDE"
	RoleModerator = "ROLE_MODERATOR"
	RoleAdmin     = "ROLE_ADMIN"
)

const (
	GuideTypeGuide       = "GUIDE"
	GuideTypeEntertainer = "ENTERTAINER"
	GuideTypeCompanion   = "COMPANION"
)

const (
	GuideStatusDraft           = "DRAFT"
	GuideStatusWaitingPayment  = "WAITING_PAYMENT"
	GuideStatusActive          = "ACTIVE"
	GuideStatusSuspended       = "SUSPENDED"
	GuideStatusBlocked         = "BLOCKED"
	GuideStatusExpired         = "EXPIRED"
)

const (
	SubscriptionActive  = "ACTIVE"
	SubscriptionExpired = "EXPIRED"
	SubscriptionPending = "PENDING"
)

const (
	PaymentPurposeGuidePlacement     = "GUIDE_PLACEMENT"
	PaymentPurposeFeaturedGuide      = "FEATURED_GUIDE"
	PaymentPurposeFeaturedExcursion  = "FEATURED_EXCURSION"
	PaymentPaid                      = "PAID"
	PaymentPending                   = "PENDING"
	PaymentCreated                   = "CREATED"
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
