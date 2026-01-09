import sys
from pathlib import Path
import copy

# Add the src directory to sys.path so we can import the FastAPI app
sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from fastapi.testclient import TestClient
from app import app, activities

client = TestClient(app)

# Preserve original activities and restore between tests to avoid test inter-dependencies
_original_activities = copy.deepcopy(activities)

import pytest

@pytest.fixture(autouse=True)
def reset_activities():
    # Before test: nothing to do (we'll restore after)
    yield
    # After each test, restore the original activities state
    activities.clear()
    activities.update(copy.deepcopy(_original_activities))


def test_unregister_participant_removes_participant():
    # Ensure the participant is initially present
    resp = client.get("/activities")
    assert resp.status_code == 200
    activities = resp.json()

    # Use an activity and participant known to be present in the seeded data
    activity_name = "Chess Club"
    participant_email = "michael@mergington.edu"

    assert participant_email in activities[activity_name]["participants"]

    # Unregister the participant
    del_resp = client.delete(f"/activities/{activity_name}/participants", params={"email": participant_email})
    assert del_resp.status_code == 200
    json_body = del_resp.json()
    assert "Unregistered" in json_body.get("message", "")

    # Verify the participant is no longer in the activity
    resp_after = client.get("/activities")
    activities_after = resp_after.json()
    assert participant_email not in activities_after[activity_name]["participants"]


def test_unregister_nonexistent_returns_404():
    # Try to delete a non-existing participant
    activity_name = "Chess Club"
    missing_email = "noone@nowhere.edu"

    del_resp = client.delete(f"/activities/{activity_name}/participants", params={"email": missing_email})
    assert del_resp.status_code == 404


def test_signup_adds_participant():
    activity_name = "Basketball Team"
    new_email = "newstudent@mergington.edu"

    # Ensure participant is not present initially
    resp = client.get("/activities")
    assert resp.status_code == 200
    activities = resp.json()
    assert new_email not in activities[activity_name]["participants"]

    # Sign up the new participant
    post_resp = client.post(f"/activities/{activity_name}/signup", params={"email": new_email})
    assert post_resp.status_code == 200
    assert "Signed up" in post_resp.json().get("message", "")

    # Verify participant is now present
    resp_after = client.get("/activities")
    activities_after = resp_after.json()
    assert new_email in activities_after[activity_name]["participants"]
