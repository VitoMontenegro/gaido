package postgres

// Photo of the author: guide portrait, then the user's own photo, then the default admin image.
const authorAvatarSQL = `COALESCE(NULLIF(gp.avatar_url, ''), NULLIF(u.avatar_url, ''), CASE WHEN 'ROLE_ADMIN' = ANY(u.roles) THEN '/images/admin.jpg' ELSE NULL END)`

const lastAuthorAvatarSQL = `COALESCE(NULLIF(lgp.avatar_url, ''), NULLIF(lu.avatar_url, ''), CASE WHEN 'ROLE_ADMIN' = ANY(lu.roles) THEN '/images/admin.jpg' ELSE NULL END)`
