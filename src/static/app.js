document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // HTML-escape helper to avoid injection when inserting strings
  function escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset the activity select to avoid duplicate options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section (list with delete icon)
        let participantsHTML = "";
        if (Array.isArray(details.participants) && details.participants.length > 0) {
          participantsHTML = '<div class="participants"><h5>Participants</h5><ul>';
          participantsHTML += details.participants.map(p => `<li><span class="participant-email">${escapeHtml(p)}</span><button type="button" class="delete-participant" data-email="${escapeHtml(p)}" data-activity="${escapeHtml(name)}" title="Unregister" aria-label="Unregister ${escapeHtml(p)}">🗑️</button></li>`).join("");
          participantsHTML += "</ul></div>";
        } else {
          participantsHTML = '<div class="participants"><h5>Participants</h5><p class="no-participants">No participants yet</p></div>';
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        // Attach delete handlers for participants in this card
        const deleteButtons = activityCard.querySelectorAll('.delete-participant');
        deleteButtons.forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const email = btn.getAttribute('data-email');
            const activityName = btn.getAttribute('data-activity');
            try {
              btn.disabled = true;
              const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              const data = await res.json();
              if (res.ok) {
                messageDiv.textContent = data.message || 'Participant removed';
                messageDiv.className = 'success';
                messageDiv.classList.remove('hidden');
                // Refresh activities list
                fetchActivities();
              } else {
                messageDiv.textContent = data.detail || 'Failed to unregister participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                btn.disabled = false;
              }
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            } catch (err) {
              console.error('Error removing participant:', err);
              messageDiv.textContent = 'Failed to unregister participant. Please try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              btn.disabled = false;
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            }
          });
        });

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list so the newly registered participant appears without a manual page reload
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
