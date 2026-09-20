-- +goose Up
-- Limit new/growing guide.about values to 1000 chars. Existing longer rows stay as-is.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION guide_about_limit() RETURNS trigger AS $func$
BEGIN
    IF char_length(NEW.about) <= 1000 THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND char_length(NEW.about) <= char_length(OLD.about) THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'about must be at most 1000 characters';
END;
$func$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_guide_about_limit ON guide_profiles;
CREATE TRIGGER trg_guide_about_limit
    BEFORE INSERT OR UPDATE OF about ON guide_profiles
    FOR EACH ROW EXECUTE FUNCTION guide_about_limit();

-- +goose Down
DROP TRIGGER IF EXISTS trg_guide_about_limit ON guide_profiles;
DROP FUNCTION IF EXISTS guide_about_limit();
