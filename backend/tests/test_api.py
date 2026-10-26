from fastapi.testclient import TestClient
from pytest import approx

from backend.api import app

client = TestClient(app)


def test_day_6_jan_matches_reference():
    body = client.get("/api/day", params={"day": "2026-01-06"}).json()
    assert body["decision_time"] == "09:50:00"
    assert body["forecast_used"] == ["2026-01-05T09:30:00Z"]
    assert body["forecast_age_hours"] == approx(20 / 60)
    assert len(body["hours"]) == 24
    assert body["missing_actuals"] == []
    s = body["summary"]
    assert (s["avg_forecast"], s["avg_actual"]) == (11464.5, 9345.75)
    assert s["mae"] == approx(2205.33, abs=0.01)
    assert (s["biggest"]["error"], s["biggest"]["startTime"]) == (4316, "2026-01-06T05:00:00Z")


def test_earlier_decision_time_uses_older_run():
    body = client.get("/api/day", params={"day": "2026-01-06", "decision_time": "08:00"}).json()
    assert body["forecast_used"] == ["2026-01-05T07:30:00Z"]


def test_day_outside_pilot_is_404():
    r = client.get("/api/day", params={"day": "2026-01-01"})
    assert r.status_code == 404
    assert "2026-01-02" in r.json()["detail"]


def test_decision_time_outside_range_is_422():
    assert client.get("/api/day", params={"day": "2026-01-06", "decision_time": "03:00"}).status_code == 422
    assert client.get("/api/january", params={"decision_time": "11:30"}).status_code == 422


def test_bad_date_is_422():
    assert client.get("/api/day", params={"day": "not-a-date"}).status_code == 422


def test_january_matches_reference():
    body = client.get("/api/january").json()
    s = body["summary"]
    assert s["hours"] == 744
    assert s["p90"] == approx(4183.9, abs=0.01)
    assert len(body["by_day"]) == 31
    assert [g["group"] for g in body["by_hour"]][:2] == ["00:00", "01:00"]
    assert [g["group"] for g in body["by_wind_level_gw"]] == [0, 5, 10, 15]
    assert sum(g["summary"]["hours"] for g in body["by_wind_level_gw"]) == 744


def test_january_csv():
    r = client.get("/api/january.csv")
    assert r.headers["content-type"].startswith("text/csv")
    lines = r.text.strip().splitlines()
    assert lines[0] == "startTime,publishTime,forecast,actual,error"
    assert len(lines) == 745


def test_successful_answers_are_cacheable_errors_are_not():
    ok = client.get("/api/day", params={"day": "2026-01-06"})
    assert ok.headers["cache-control"] == "public, max-age=86400"
    bad = client.get("/api/day", params={"day": "2026-01-01"})
    assert "cache-control" not in bad.headers


def test_missing_actuals_are_listed_and_left_out(monkeypatch):
    from backend import data

    full = data.actuals()
    gone = {"2026-01-06T05:00:00Z", "2026-01-06T06:00:00Z"}
    monkeypatch.setattr(data, "actuals", lambda: {k: v for k, v in full.items() if k not in gone})
    body = client.get("/api/day", params={"day": "2026-01-06"}).json()
    assert body["missing_actuals"] == sorted(gone)
    assert body["summary"]["hours"] == 22


def test_no_actuals_gives_null_summary(monkeypatch):
    from backend import data

    monkeypatch.setattr(data, "actuals", lambda: {})
    body = client.get("/api/day", params={"day": "2026-01-06"}).json()
    assert body["summary"] is None
    assert len(body["missing_actuals"]) == 24
