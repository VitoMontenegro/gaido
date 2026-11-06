package postgres

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type InquiryRepo struct{ db *DB }

func NewInquiryRepo(db *DB) *InquiryRepo { return &InquiryRepo{db: db} }

func (r *InquiryRepo) Create(ctx context.Context, in *domain.Inquiry) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO inquiries (
			tourist_user_id, guide_id, excursion_id, status, preferred_date, date_from, date_to,
			party_size, language, notes
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING id, created_at, updated_at
	`, in.TouristUserID, in.GuideID, in.ExcursionID, in.Status, in.PreferredDate, in.DateFrom, in.DateTo,
		in.PartySize, in.Language, in.Notes).Scan(&in.ID, &in.CreatedAt, &in.UpdatedAt)
	return err
}

func (r *InquiryRepo) FindOpen(ctx context.Context, touristID, guideID int64, excursionID *int64) (*domain.Inquiry, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT i.id FROM inquiries i
		WHERE i.tourist_user_id=$1 AND i.guide_id=$2 AND i.status IN ('new','discussing','pending','booked')
		  AND (($3::bigint IS NULL AND i.excursion_id IS NULL) OR i.excursion_id IS NOT DISTINCT FROM $3)
		ORDER BY i.id DESC LIMIT 1
	`, touristID, guideID, excursionID)
	var id int64
	if err := row.Scan(&id); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return r.Get(ctx, id, 0)
}

func inquirySelect() string {
	return `
		SELECT i.id, i.tourist_user_id, i.guide_id, gp.user_id, i.excursion_id, i.status,
			i.preferred_date, i.date_from, i.date_to, i.party_size, i.language, i.notes,
			i.scheduled_at, i.scheduled_end_at, i.cancel_reason, i.cancelled_by,
			i.help_requested, i.first_guide_reply_at, i.closed_at, i.created_at, i.updated_at,
			TRIM(BOTH FROM COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS tourist_name,
			gp.display_name, gp.website_slug,
			COALESCE(e.title,''), COALESCE(e.slug,''), COALESCE(e.duration_minutes, 0),
			COALESCE((
				SELECT COUNT(*) FROM inquiry_messages m
				WHERE m.inquiry_id = i.id AND m.kind <> 'internal_note'
				  AND m.id > COALESCE(rd.last_read_message_id, 0)
			), 0)::int AS unread,
			lm.created_at, COALESCE(lm.body, '')
	`
}

func (r *InquiryRepo) Get(ctx context.Context, id, viewerUserID int64) (*domain.Inquiry, error) {
	row := r.db.Pool.QueryRow(ctx, inquirySelect()+`
		FROM inquiries i
		JOIN users u ON u.id = i.tourist_user_id
		JOIN guide_profiles gp ON gp.id = i.guide_id
		LEFT JOIN excursions e ON e.id = i.excursion_id
		LEFT JOIN inquiry_reads rd ON rd.inquiry_id = i.id AND rd.user_id = $2
		LEFT JOIN LATERAL (
			SELECT body, created_at FROM inquiry_messages
			WHERE inquiry_id = i.id AND kind <> 'internal_note'
			ORDER BY id DESC LIMIT 1
		) lm ON TRUE
		WHERE i.id = $1
	`, id, viewerUserID)
	return scanInquiry(row)
}

func (r *InquiryRepo) List(ctx context.Context, touristID, guideID int64, filter string, viewerUserID int64, limit, offset int) ([]domain.Inquiry, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	var statusClause string
	args := []any{viewerUserID, touristID, guideID, limit, offset}
	switch filter {
	case "new":
		statusClause = `AND i.status = 'new'`
	case "discussing", "open_work":
		statusClause = `AND i.status = 'discussing'`
	case "pending":
		statusClause = `AND i.status = 'pending'`
	case "booked":
		statusClause = `AND i.status = 'booked'`
	case "done":
		statusClause = `AND i.status IN ('done','closed')`
	case "archive":
		statusClause = `AND i.status IN ('done','closed','cancelled')`
	case "open":
		statusClause = `AND i.status IN ('new','discussing','pending','booked')`
	case "unanswered":
		statusClause = `AND i.status IN ('new','discussing','pending') AND i.first_guide_reply_at IS NULL`
	case "help":
		statusClause = `AND i.help_requested AND i.status IN ('new','discussing','pending','booked')`
	default:
		statusClause = ``
	}
	who := `AND ($2::bigint = 0 OR i.tourist_user_id = $2) AND ($3::bigint = 0 OR i.guide_id = $3)`
	rows, err := r.db.Pool.Query(ctx, inquirySelect()+`
		FROM inquiries i
		JOIN users u ON u.id = i.tourist_user_id
		JOIN guide_profiles gp ON gp.id = i.guide_id
		LEFT JOIN excursions e ON e.id = i.excursion_id
		LEFT JOIN inquiry_reads rd ON rd.inquiry_id = i.id AND rd.user_id = $1
		LEFT JOIN LATERAL (
			SELECT body, created_at FROM inquiry_messages
			WHERE inquiry_id = i.id AND kind <> 'internal_note'
			ORDER BY id DESC LIMIT 1
		) lm ON TRUE
		WHERE TRUE `+who+` `+statusClause+`
		ORDER BY i.updated_at DESC, i.id DESC
		LIMIT $4 OFFSET $5
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Inquiry
	for rows.Next() {
		item, err := scanInquiry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *InquiryRepo) CountBuckets(ctx context.Context, touristID, guideID int64) (map[string]int, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status = 'new')::int,
			COUNT(*) FILTER (WHERE status = 'discussing')::int,
			COUNT(*) FILTER (WHERE status = 'pending')::int,
			COUNT(*) FILTER (WHERE status = 'booked')::int,
			COUNT(*) FILTER (WHERE status IN ('done','closed','cancelled'))::int
		FROM inquiries
		WHERE ($1::bigint = 0 OR tourist_user_id = $1)
		  AND ($2::bigint = 0 OR guide_id = $2)
	`, touristID, guideID)
	var n, d, p, b, a int
	if err := row.Scan(&n, &d, &p, &b, &a); err != nil {
		return nil, err
	}
	return map[string]int{"new": n, "discussing": d, "pending": p, "booked": b, "archive": a}, nil
}

func (r *InquiryRepo) ListAgenda(ctx context.Context, guideID int64, from, to time.Time) ([]domain.Inquiry, error) {
	rows, err := r.db.Pool.Query(ctx, inquirySelect()+`
		FROM inquiries i
		JOIN users u ON u.id = i.tourist_user_id
		JOIN guide_profiles gp ON gp.id = i.guide_id
		LEFT JOIN excursions e ON e.id = i.excursion_id
		LEFT JOIN inquiry_reads rd ON rd.inquiry_id = i.id AND rd.user_id = gp.user_id
		LEFT JOIN LATERAL (
			SELECT body, created_at FROM inquiry_messages
			WHERE inquiry_id = i.id AND kind <> 'internal_note'
			ORDER BY id DESC LIMIT 1
		) lm ON TRUE
		WHERE i.guide_id = $1 AND i.status IN ('new','discussing','pending','booked')
		  AND COALESCE(i.scheduled_at::date, i.preferred_date) IS NOT NULL
		  AND COALESCE(i.scheduled_at::date, i.preferred_date) >= $2::date
		  AND COALESCE(i.scheduled_at::date, i.preferred_date) < $3::date
		ORDER BY COALESCE(i.scheduled_at, i.preferred_date::timestamptz) ASC, i.id ASC
	`, guideID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Inquiry
	for rows.Next() {
		item, err := scanInquiry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *InquiryRepo) UpdateStatus(ctx context.Context, id int64, status string, help *bool) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE inquiries SET
			status = $2,
			help_requested = COALESCE($3, help_requested),
			closed_at = CASE WHEN $2 IN ('closed','cancelled','done') THEN COALESCE(closed_at, NOW()) ELSE closed_at END,
			updated_at = NOW()
		WHERE id = $1
	`, id, status, help)
	return err
}

func (r *InquiryRepo) UpdateCRM(ctx context.Context, in *domain.Inquiry) error {
	terminal := in.Status == domain.InquiryDone || in.Status == domain.InquiryClosed || in.Status == domain.InquiryCancelled
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE inquiries SET
			status = $2,
			scheduled_at = $3,
			scheduled_end_at = $4,
			preferred_date = COALESCE($5::date, preferred_date),
			cancel_reason = $6,
			cancelled_by = $7,
			closed_at = CASE WHEN $8 THEN COALESCE(closed_at, NOW()) ELSE closed_at END,
			updated_at = NOW()
		WHERE id = $1
	`, in.ID, in.Status, in.ScheduledAt, in.ScheduledEndAt, in.PreferredDate, in.CancelReason, in.CancelledBy, terminal)
	return err
}

func (r *InquiryRepo) HasScheduleOverlap(ctx context.Context, guideID, excludeID int64, start, end time.Time) (bool, error) {
	var exists bool
	err := r.db.Pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM inquiries
			WHERE guide_id = $1 AND id <> $2 AND status IN ('pending','booked')
			  AND scheduled_at IS NOT NULL AND scheduled_end_at IS NOT NULL
			  AND scheduled_at < $4 AND scheduled_end_at > $3
		)
	`, guideID, excludeID, start, end).Scan(&exists)
	return exists, err
}

func (r *InquiryRepo) MarkGuideReplied(ctx context.Context, id int64) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE inquiries SET
			first_guide_reply_at = COALESCE(first_guide_reply_at, NOW()),
			status = CASE WHEN status = 'new' THEN 'discussing' ELSE status END,
			updated_at = NOW()
		WHERE id = $1
	`, id)
	return err
}

func (r *InquiryRepo) TouchDiscussing(ctx context.Context, id int64) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE inquiries SET
			status = CASE WHEN status = 'new' THEN 'discussing' ELSE status END,
			updated_at = NOW()
		WHERE id = $1
	`, id)
	return err
}

func (r *InquiryRepo) InsertMessage(ctx context.Context, m *domain.InquiryMessage) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO inquiry_messages (inquiry_id, author_user_id, author_role, kind, body, media_key)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING id, created_at
	`, m.InquiryID, m.AuthorUserID, m.AuthorRole, m.Kind, m.Body, m.MediaKey).Scan(&m.ID, &m.CreatedAt)
	if err != nil {
		return err
	}
	_, err = r.db.Pool.Exec(ctx, `UPDATE inquiries SET updated_at = NOW() WHERE id = $1`, m.InquiryID)
	return err
}

func (r *InquiryRepo) ListMessages(ctx context.Context, inquiryID, after int64, includeInternal bool, limit int) ([]domain.InquiryMessage, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	internal := ``
	if !includeInternal {
		internal = `AND m.kind <> 'internal_note'`
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT m.id, m.inquiry_id, m.author_user_id, m.author_role, m.kind, m.body, m.media_key, m.created_at,
			CASE
				WHEN m.author_role = 'system' THEN 'Gaido'
				WHEN m.author_role = 'admin' THEN 'Підтримка Gaido'
				WHEN m.author_user_id IS NULL THEN ''
				ELSE TRIM(BOTH FROM COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,''))
			END
		FROM inquiry_messages m
		LEFT JOIN users u ON u.id = m.author_user_id
		WHERE m.inquiry_id = $1 AND m.id > $2 `+internal+`
		ORDER BY m.id ASC
		LIMIT $3
	`, inquiryID, after, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.InquiryMessage
	for rows.Next() {
		var m domain.InquiryMessage
		if err := rows.Scan(&m.ID, &m.InquiryID, &m.AuthorUserID, &m.AuthorRole, &m.Kind, &m.Body, &m.MediaKey, &m.CreatedAt, &m.AuthorName); err != nil {
			return nil, err
		}
		m.AuthorName = strings.TrimSpace(m.AuthorName)
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r *InquiryRepo) MarkRead(ctx context.Context, inquiryID, userID, lastID int64) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO inquiry_reads (inquiry_id, user_id, last_read_message_id)
		VALUES ($1,$2,$3)
		ON CONFLICT (inquiry_id, user_id) DO UPDATE SET last_read_message_id = GREATEST(inquiry_reads.last_read_message_id, EXCLUDED.last_read_message_id)
	`, inquiryID, userID, lastID)
	return err
}

func (r *InquiryRepo) PeerLastRead(ctx context.Context, inquiryID, userID int64) (int64, error) {
	if inquiryID <= 0 || userID <= 0 {
		return 0, nil
	}
	var lastID int64
	err := r.db.Pool.QueryRow(ctx, `
		SELECT last_read_message_id FROM inquiry_reads
		WHERE inquiry_id = $1 AND user_id = $2
	`, inquiryID, userID).Scan(&lastID)
	if err == pgx.ErrNoRows {
		return 0, nil
	}
	return lastID, err
}

func (r *InquiryRepo) ListDueUnreadEmails(ctx context.Context, limit int) ([]domain.UnreadInquiryMail, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT m.id, m.inquiry_id, m.kind, m.body, m.author_role,
			CASE
				WHEN m.author_role = 'admin' THEN 'Підтримка Gaido'
				WHEN m.author_role = 'guide' THEN COALESCE(NULLIF(TRIM(gp.display_name), ''), 'Гід')
				ELSE TRIM(BOTH FROM COALESCE(tu.first_name,'') || ' ' || COALESCE(tu.last_name,''))
			END AS author_name,
			i.tourist_user_id, gp.user_id,
			TRIM(BOTH FROM COALESCE(tu.first_name,'') || ' ' || COALESCE(tu.last_name,'')),
			COALESCE(NULLIF(TRIM(gp.display_name), ''), 'Гід'),
			COALESCE(tr.last_read_message_id, 0) < m.id AS tourist_unread,
			COALESCE(gr.last_read_message_id, 0) < m.id AS guide_unread
		FROM inquiry_messages m
		JOIN inquiries i ON i.id = m.inquiry_id
		JOIN guide_profiles gp ON gp.id = i.guide_id
		JOIN users tu ON tu.id = i.tourist_user_id
		LEFT JOIN inquiry_reads tr ON tr.inquiry_id = i.id AND tr.user_id = i.tourist_user_id
		LEFT JOIN inquiry_reads gr ON gr.inquiry_id = i.id AND gr.user_id = gp.user_id
		WHERE m.unread_email_sent_at IS NULL
		  AND m.kind IN ('text', 'attachment')
		  AND m.author_role IN ('tourist', 'guide', 'admin')
		  AND m.created_at <= NOW() - INTERVAL '5 minutes'
		  AND (
			(m.author_role = 'tourist' AND COALESCE(gr.last_read_message_id, 0) < m.id)
			OR (m.author_role = 'guide' AND COALESCE(tr.last_read_message_id, 0) < m.id)
			OR (m.author_role = 'admin' AND (
				COALESCE(tr.last_read_message_id, 0) < m.id
				OR COALESCE(gr.last_read_message_id, 0) < m.id
			))
		  )
		ORDER BY m.id ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.UnreadInquiryMail
	for rows.Next() {
		var m domain.UnreadInquiryMail
		if err := rows.Scan(
			&m.MessageID, &m.InquiryID, &m.Kind, &m.Body, &m.AuthorRole, &m.AuthorName,
			&m.TouristUserID, &m.GuideUserID, &m.TouristName, &m.GuideName,
			&m.TouristUnread, &m.GuideUnread,
		); err != nil {
			return nil, err
		}
		m.AuthorName = strings.TrimSpace(m.AuthorName)
		m.TouristName = strings.TrimSpace(m.TouristName)
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r *InquiryRepo) MarkUnreadEmailSent(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE inquiry_messages SET unread_email_sent_at = NOW()
		WHERE id = ANY($1) AND unread_email_sent_at IS NULL
	`, ids)
	return err
}

func (r *InquiryRepo) LogAdmin(ctx context.Context, inquiryID, adminID int64, action string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO inquiry_admin_log (inquiry_id, admin_user_id, action) VALUES ($1,$2,$3)
	`, inquiryID, adminID, action)
	return err
}

func (r *InquiryRepo) ListClients(ctx context.Context, guideID int64) ([]domain.InquiryClient, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT c.tourist_user_id,
			TRIM(BOTH FROM COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS name,
			c.inquiry_count, c.last_inquiry_at, c.last_inquiry_id, i.status
		FROM (
			SELECT tourist_user_id,
				COUNT(*)::int AS inquiry_count,
				MAX(created_at) AS last_inquiry_at,
				MAX(id) AS last_inquiry_id
			FROM inquiries
			WHERE guide_id = $1
			GROUP BY tourist_user_id
		) c
		JOIN users u ON u.id = c.tourist_user_id
		JOIN inquiries i ON i.id = c.last_inquiry_id
		ORDER BY c.last_inquiry_at DESC
	`, guideID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.InquiryClient
	for rows.Next() {
		var c domain.InquiryClient
		if err := rows.Scan(&c.TouristUserID, &c.TouristName, &c.InquiryCount, &c.LastInquiryAt, &c.LastInquiryID, &c.LastStatus); err != nil {
			return nil, err
		}
		c.TouristName = displayName(c.TouristName, c.TouristUserID)
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *InquiryRepo) InsertFunnel(ctx context.Context, guideID int64, excursionID *int64, userID *int64, sessionKey, eventType string, uniqueDaily bool) error {
	if uniqueDaily {
		var exists int
		err := r.db.Pool.QueryRow(ctx, `
			SELECT 1 FROM guide_funnel_events
			WHERE guide_id=$1 AND event_type=$2
			  AND COALESCE(excursion_id,0) = COALESCE($3,0)
			  AND COALESCE(user_id,0) = COALESCE($4,0)
			  AND session_key=$5
			  AND (timezone('UTC', created_at))::date = (timezone('UTC', NOW()))::date
			LIMIT 1
		`, guideID, eventType, excursionID, userID, sessionKey).Scan(&exists)
		if err == nil {
			return nil
		}
		if err != pgx.ErrNoRows {
			return err
		}
	}
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO guide_funnel_events (guide_id, excursion_id, user_id, session_key, event_type)
		VALUES ($1,$2,$3,$4,$5)
	`, guideID, excursionID, userID, sessionKey, eventType)
	return err
}

func (r *InquiryRepo) FunnelStats(ctx context.Context, guideID int64, from, to time.Time) (domain.GuideFunnelStats, error) {
	var st domain.GuideFunnelStats
	st.From = from.Format("2006-01-02")
	st.To = to.Format("2006-01-02")
	err := r.db.Pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE event_type='profile_view')::int,
			COUNT(*) FILTER (WHERE event_type='excursion_view')::int,
			COUNT(*) FILTER (WHERE event_type='contact_click')::int
		FROM guide_funnel_events
		WHERE guide_id=$1 AND created_at >= $2 AND created_at < $3
	`, guideID, from, to).Scan(&st.ProfileViews, &st.ExcursionViews, &st.ContactClicks)
	if err != nil {
		return st, err
	}
	err = r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*)::int,
			COUNT(*) FILTER (WHERE first_guide_reply_at IS NOT NULL)::int
		FROM inquiries
		WHERE guide_id=$1 AND created_at >= $2 AND created_at < $3
	`, guideID, from, to).Scan(&st.Inquiries, &st.Replied)
	if err != nil {
		return st, err
	}
	if st.Inquiries > 0 {
		st.ReplyRate = float64(st.Replied) / float64(st.Inquiries)
	}
	var median *float64
	err = r.db.Pool.QueryRow(ctx, `
		SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
			ORDER BY EXTRACT(EPOCH FROM (first_guide_reply_at - created_at)) / 60.0
		)
		FROM inquiries
		WHERE guide_id=$1 AND created_at >= $2 AND created_at < $3 AND first_guide_reply_at IS NOT NULL
	`, guideID, from, to).Scan(&median)
	if err != nil && err != pgx.ErrNoRows {
		return st, err
	}
	if median != nil {
		m := int(*median)
		st.MedianReplyMin = &m
	}
	return st, nil
}

type inquiryRow interface {
	Scan(dest ...any) error
}

func scanInquiry(row inquiryRow) (*domain.Inquiry, error) {
	var in domain.Inquiry
	var touristName string
	err := row.Scan(
		&in.ID, &in.TouristUserID, &in.GuideID, &in.GuideUserID, &in.ExcursionID, &in.Status,
		&in.PreferredDate, &in.DateFrom, &in.DateTo, &in.PartySize, &in.Language, &in.Notes,
		&in.ScheduledAt, &in.ScheduledEndAt, &in.CancelReason, &in.CancelledBy,
		&in.HelpRequested, &in.FirstGuideReplyAt, &in.ClosedAt, &in.CreatedAt, &in.UpdatedAt,
		&touristName, &in.GuideName, &in.GuideSlug, &in.ExcursionTitle, &in.ExcursionSlug, &in.ExcursionDurationMinutes,
		&in.Unread, &in.LastMessageAt, &in.LastPreview,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	in.TouristName = displayName(touristName, in.TouristUserID)
	if len(in.LastPreview) > 140 {
		in.LastPreview = in.LastPreview[:140]
	}
	return &in, nil
}

func displayName(name string, id int64) string {
	name = strings.TrimSpace(name)
	if name != "" {
		return name
	}
	return "Мандрівник"
}
