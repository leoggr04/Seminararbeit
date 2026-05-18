import { deleteUserAccount, getDeleteErrorMessage, getFriendlyErrorMessage, getUserByEmail, loginUser } from "./api.js";

const verifyForm = document.getElementById("verifyForm");
const resultStep = document.getElementById("resultStep");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const statusBox = document.getElementById("statusBox");
const verifyButton = document.getElementById("verifyButton");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const state = {
  accessToken: null,
  userId: null,
  userLabel: "",
};

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle("is-hidden", hidden);
}

function setDisabled(element, disabled) {
  if (!element) return;
  element.classList.toggle("is-disabled", disabled);
  if ("disabled" in element) element.disabled = disabled;
}

function showStatus(type, message) {
  if (!statusBox) return;
  statusBox.hidden = false;
  statusBox.className = `status-box ${type}`;
  statusBox.textContent = message;
}

function clearStatus() {
  if (!statusBox) return;
  statusBox.hidden = true;
  statusBox.textContent = "";
  statusBox.className = "status-box";
}

function resetAll() {
  verifyForm.reset();
  state.accessToken = null;
  state.userId = null;
  state.userLabel = "";
  setHidden(verifyForm, false);
  setHidden(resultStep, true);
  clearStatus();
  setDisabled(verifyButton, false);
}

function showSuccessResult(message) {
  if (resultTitle) resultTitle.textContent = "Account gelöscht";
  if (resultMessage) resultMessage.textContent = message;
  setHidden(verifyForm, true);
  setHidden(resultStep, false);
  showStatus("success", message);
}

function toggleBusy(isBusy) {
  setDisabled(verifyButton, isBusy);
  setDisabled(emailInput, isBusy);
  setDisabled(passwordInput, isBusy);
}

async function resolveUserId(email, accessToken, fallbackUser) {
  const directId = Number(fallbackUser?.user_id ?? fallbackUser?.id);
  if (Number.isFinite(directId) && directId > 0) {
    return {
      userId: directId,
      label: `${fallbackUser?.first_name ?? "Nutzer"} ${fallbackUser?.last_name ?? ""}`.trim(),
    };
  }

  const lookupResponse = await getUserByEmail(email, accessToken);
  const lookupUser = lookupResponse?.data?.data ?? lookupResponse?.data ?? lookupResponse;
  const lookupId = Number(lookupUser?.user_id ?? lookupUser?.id);
  if (!Number.isFinite(lookupId) || lookupId <= 0) throw new Error("User ID konnte nicht ermittelt werden.");
  return { userId: lookupId, label: `${lookupUser?.first_name ?? "Nutzer"} ${lookupUser?.last_name ?? ""}`.trim() };
}

verifyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();

  const email = String(emailInput.value || "").trim().toLowerCase();
  const password = String(passwordInput.value || "");
  if (!email || !password) {
    showStatus("error", "Bitte E-Mail und Passwort eingeben.");
    return;
  }

  toggleBusy(true);
  try {
    const response = await loginUser(email, password);
    const payload = response?.data ?? response ?? {};
    const accessToken = payload.accessToken;
    const { user } = payload;
    if (!accessToken) throw new Error("accessToken missing");

    const resolved = await resolveUserId(email, accessToken, user);
    state.accessToken = accessToken;
    state.userId = resolved.userId;
    state.userLabel = resolved.label || email;

    // Direkt nach erfolgreicher Verifizierung: löschen
    showStatus("info", `Konto verifiziert: ${state.userLabel}. Lösche Account...`);
    try {
      await deleteUserAccount(state.userId, state.accessToken);
      showSuccessResult("Dein Konto wurde erfolgreich gelöscht. Diese Seite kann jetzt geschlossen werden.");
    } catch (error) {
      showStatus("error", getDeleteErrorMessage(error));
    }
  } catch (error) {
    showStatus("error", getFriendlyErrorMessage(error));
  } finally {
    toggleBusy(false);
  }
});

resetAll();