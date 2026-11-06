package domain

import "time"

const (
	InquiryNew        = "new"
	InquiryDiscussing = "discussing"
	InquiryPending    = "pending"
	InquiryBooked     = "booked"
	InquiryDone       = "done"
	InquiryClosed     = "closed"
	InquiryCancelled  = "cancelled"

	InquiryAuthorTourist = "tourist"
	InquiryAuthorGuide   = "guide"
	InquiryAuthorAdmin   = "admin"
	InquiryAuthorSystem  = "system"

	InquiryKindText         = "text"
	InquiryKindSystem       = "system"
	InquiryKindAttachment   = "attachment"
	InquiryKindInternalNote = "internal_note"

	FunnelProfileView     = "profile_view"
	FunnelExcursionView   = "excursion_view"
	FunnelContactClick    = "contact_click"
	FunnelInquiryCreated  = "inquiry_created"
	FunnelFirstGuideReply = "first_reply"
)

type Inquiry struct {
	ID                int64      `json:"id"`
	TouristUserID     int64      `json:"tourist_user_id"`
	GuideID           int64      `json:"guide_id"`
	GuideUserID       int64      `json:"guide_user_id,omitempty"`
	ExcursionID       *int64     `json:"excursion_id,omitempty"`
	Status            string     `json:"status"`
	PreferredDate     *time.Time `json:"preferred_date,omitempty"`
	DateFrom          *time.Time `json:"date_from,omitempty"`
	DateTo            *time.Time `json:"date_to,omitempty"`
	PartySize         int        `json:"party_size"`
	Language          string     `json:"language"`
	Notes             string     `json:"notes"`
	ScheduledAt       *time.Time `json:"scheduled_at,omitempty"`
	ScheduledEndAt    *time.Time `json:"scheduled_end_at,omitempty"`
	CancelReason      string     `json:"cancel_reason,omitempty"`
	CancelledBy       string     `json:"cancelled_by,omitempty"`
	HelpRequested     bool       `json:"help_requested"`
	FirstGuideReplyAt *time.Time `json:"first_guide_reply_at,omitempty"`
	ClosedAt          *time.Time `json:"closed_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`

	TouristName              string     `json:"tourist_name"`
	GuideName                string     `json:"guide_name"`
	GuideSlug                string     `json:"guide_slug,omitempty"`
	ExcursionTitle           string     `json:"excursion_title,omitempty"`
	ExcursionSlug            string     `json:"excursion_slug,omitempty"`
	ExcursionDurationMinutes int        `json:"excursion_duration_minutes,omitempty"`
	Unread                   int        `json:"unread"`
	LastMessageAt            *time.Time `json:"last_message_at,omitempty"`
	LastPreview              string     `json:"last_preview,omitempty"`
}

type InquiryMessage struct {
	ID           int64     `json:"id"`
	InquiryID    int64     `json:"inquiry_id"`
	AuthorUserID *int64    `json:"author_user_id,omitempty"`
	AuthorRole   string    `json:"author_role"`
	AuthorName   string    `json:"author_name,omitempty"`
	Kind         string    `json:"kind"`
	Body         string    `json:"body"`
	MediaKey     string    `json:"media_key,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type InquiryClient struct {
	TouristUserID int64     `json:"tourist_user_id"`
	TouristName   string    `json:"tourist_name"`
	InquiryCount  int       `json:"inquiry_count"`
	LastInquiryAt time.Time `json:"last_inquiry_at"`
	LastInquiryID int64     `json:"last_inquiry_id"`
	LastStatus    string    `json:"last_status,omitempty"`
}

type GuideFunnelStats struct {
	ProfileViews   int     `json:"profile_views"`
	ExcursionViews int     `json:"excursion_views"`
	ContactClicks  int     `json:"contact_clicks"`
	Inquiries      int     `json:"inquiries"`
	Replied        int     `json:"replied"`
	ReplyRate      float64 `json:"reply_rate"`
	MedianReplyMin *int    `json:"median_reply_minutes,omitempty"`
	From           string  `json:"from"`
	To             string  `json:"to"`
}

func NormalizeInquiryStatus(s string) string {
	if s == InquiryClosed {
		return InquiryDone
	}
	return s
}

func ValidInquiryStatus(s string) bool {
	switch NormalizeInquiryStatus(s) {
	case InquiryNew, InquiryDiscussing, InquiryPending, InquiryBooked, InquiryDone, InquiryCancelled:
		return true
	default:
		return false
	}
}

func InquiryIsOpen(s string) bool {
	switch s {
	case InquiryNew, InquiryDiscussing, InquiryPending, InquiryBooked:
		return true
	default:
		return false
	}
}

func InquiryNeedsSchedule(s string) bool {
	return s == InquiryPending || s == InquiryBooked
}

func CanChangeInquiryStatus(from, to, role string) bool {
	from = NormalizeInquiryStatus(from)
	to = NormalizeInquiryStatus(to)
	if from == to {
		return true
	}
	if from == InquiryDone || from == InquiryCancelled {
		return role == InquiryAuthorAdmin
	}
	if role == InquiryAuthorTourist {
		if to == InquiryCancelled {
			return InquiryIsOpen(from)
		}
		return from == InquiryPending && to == InquiryBooked
	}
	switch to {
	case InquiryDiscussing:
		return from == InquiryNew || from == InquiryPending
	case InquiryPending:
		return from == InquiryNew || from == InquiryDiscussing || from == InquiryBooked
	case InquiryBooked:
		return from == InquiryNew || from == InquiryDiscussing || from == InquiryPending
	case InquiryDone:
		return from == InquiryBooked || from == InquiryDiscussing || from == InquiryPending
	case InquiryCancelled:
		return InquiryIsOpen(from)
	default:
		return false
	}
}
