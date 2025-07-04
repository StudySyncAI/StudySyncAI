document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const appContainer = document.getElementById('app-container');
    const allModeButtons = document.querySelectorAll(".mode-btn");
    const logoLink = document.getElementById("logo-link");

    // Sections
    const dashboardSection = document.getElementById("dashboard-section");
    const modeSelectorSection = document.querySelector(".mode-selector");
    const pdfUploadSection = document.getElementById("pdf-upload-section");
    const chatSection = document.getElementById("chat-section");
    const flashcardSection = document.getElementById("flashcard-section");
    const quizSection = document.getElementById("quiz-section");
    const paperGraderSection = document.getElementById("paper-grader-section");
    const allMainSections = [dashboardSection, modeSelectorSection, pdfUploadSection, chatSection, flashcardSection, quizSection, paperGraderSection];

    // Chat
    const chatWindow = document.getElementById("chat-window");
    const chatForm = document.getElementById("chat-form");
    const userQuestionInput = document.getElementById("user-question");
    const askButton = document.getElementById("ask-button");
    const typingIndicator = document.getElementById("typing-indicator");
    const chatModeTitle = document.getElementById("chat-mode-title");
    const exportPdfBtn = document.getElementById("export-pdf-btn");
    const clearChatBtn = document.getElementById("clear-chat-btn");

    // Header & Profile
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const profileContainer = document.getElementById("profile-container");
    const profileDropdown = document.getElementById("profile-dropdown");
    const myDecksBtn = document.getElementById("my-decks-btn");
    const settingsBtn = document.getElementById("settings-btn");

    // Modals
    const tosModalOverlay = document.getElementById("tos-modal-overlay");
    const tosAcceptBtn = document.getElementById("tos-accept-btn");
    const tosDeclineBtn = document.getElementById("tos-decline-btn");
    const appBlockedOverlay = document.getElementById("app-blocked-overlay");
    const viewTosBtn = document.getElementById("view-tos-btn");
    const modalBetaWarning = document.getElementById("modal-beta-warning");
    const modalBetaCloseBtn = document.getElementById("modal-beta-close-btn");
    const saveDeckModal = document.getElementById("save-deck-modal");
    const saveDeckForm = document.getElementById("save-deck-form");
    const deckNameInput = document.getElementById("deck-name-input");
    const myDecksModal = document.getElementById("my-decks-modal");
    const settingsModal = document.getElementById("settings-modal");
    const settingsForm = document.getElementById('settings-form');

    // Flashcards
    const flashcardGenForm = document.getElementById("flashcard-gen-form");
    const flashcardTopicInput = document.getElementById("flashcard-topic");
    const flashcardCountInput = document.getElementById("flashcard-count");
    const flashcardCountDisplay = document.getElementById("flashcard-count-display");
    const flashcardViewer = document.getElementById("flashcard-viewer");
    const flashcardContainer = document.getElementById("flashcard-container");
    const flashcardPrevBtn = document.getElementById("flashcard-prev-btn");
    const flashcardNextBtn = document.getElementById("flashcard-next-btn");
    const saveDeckBtn = document.getElementById("save-deck-btn");
    const flashcardStatus = document.getElementById("flashcard-status");

    // Quiz elements
    const quizGenForm = document.getElementById("quiz-gen-form");
    const quizTopicInput = document.getElementById("quiz-topic");
    const quizStatus = document.getElementById("quiz-status");
    const quizQuestionCountInput = document.getElementById("quiz-question-count");
    const quizCountDisplay = document.getElementById("quiz-count-display");
    const quizViewer = document.getElementById("quiz-viewer");
    const quizProgress = document.getElementById("quiz-progress");
    const quizQuestionContainer = document.getElementById("quiz-question-container");
    const quizOptionsFieldset = document.getElementById("quiz-options");
    const quizPrevBtn = document.getElementById("quiz-prev-btn");
    const quizNextBtn = document.getElementById("quiz-next-btn");
    const quizReviewSection = document.getElementById("quiz-review-section");
    const quizResultsHeader = document.getElementById("quiz-results-header");
    const quizReviewContainer = document.getElementById("quiz-review-container");
    const takeNewQuizBtn = document.getElementById("take-new-quiz-btn");

    // Paper Grader
    const paperGraderForm = document.getElementById("paper-grader-form");
    const gradeSelectorContainer = document.getElementById("grade-selector-container");
    const typeSelectorContainer = document.getElementById("type-selector-container");
    const paperGraderText = document.getElementById("paper-grader-text");
    const paperGraderStatus = document.getElementById("paper-grader-status");
    const paperGraderResults = document.getElementById("paper-grader-results");

    // PDF Upload
    const uploadForm = document.getElementById("upload-form");
    const pdfFileInput = document.getElementById("pdf-file-input");
    const uploadStatus = document.getElementById("upload-status");

    // Calculator
    const toggleCalculatorBtn = document.getElementById("toggle-calculator-btn");
    const calculator = document.getElementById("calculator");
    const calcDisplay = document.getElementById("calc-display");
    const calcButtons = document.querySelectorAll(".calc-buttons button[data-value]");
    const calcClearBtn = document.getElementById("calc-clear");
    const calcEqualsBtn = document.getElementById("calc-equals");
    const closeCalculatorBtn = document.getElementById("close-calculator");
    const calculatorHeader = document.querySelector(".calculator-header");

    // Avatar
    const aiAvatar = document.getElementById("ai-avatar");
    const aiAvatarImg = aiAvatar.querySelector("img");
    const avatarSpeechBubble = document.getElementById('avatar-speech-bubble');
    
    // Contextual Expansion
    const textSelectionPopup = document.getElementById('text-selection-popup');

    // Templates
    const chatMessageTemplate = document.getElementById("chat-message-template");
    const deckItemTemplate = document.getElementById("deck-item-template");

    // --- STATE ---
    const AVATAR_URLS = {
        waving: "https://i.ibb.co/Z62HKrZG/20250701-1749-Friendly-AI-Mascot-simple-compose-01jz469eytf25t839d2t611p8q.png",
        thinking: "https://i.ibb.co/Lznwx288/20250701-1751-Curious-Robot-Detective-remix-01jz46cg81fs699kv1mwv63rkb.png"
    };
    const STUDY_TIPS = [
        "Take regular breaks! The Pomodoro Technique is very effective.",
        "Teach what you've learned to someone else to solidify knowledge.",
        "Stay hydrated. Your brain needs water to function at its best.",
        "Get enough sleep. It's crucial for memory consolidation.",
        "Test yourself regularly, don't just re-read your notes.",
        "Create a dedicated study space to minimize distractions."
    ];
    let currentMode = "dashboard";
    let conversationHistory = [];
    let pdfContext = "";
    let unsavedFlashcards = [];
    let currentDeckIsSaved = false;
    let flashcardIndex = 0;
    let quizQuestions = [];
    let quizCurrentIndex = 0;
    let userAnswers = [];
    let selectedGrade = "Grade 9";
    let selectedPaperType = "Narrative";

    let speechBubbleTimeout;
    let idleTimer;

    let userId = document.body.dataset.userId;
    let userName = document.body.dataset.userName;
    let userPicture = document.body.dataset.userPicture;

    // --- UTILITY & CORE APP FUNCTIONS ---
    async function secureFetch(url, options = {}) {
        const defaultHeaders = {
            'X-Requested-With': 'XMLHttpRequest'
        };
        // Do not set Content-Type for FormData, browser does it better with boundary
        if (!(options.body instanceof FormData)) {
            defaultHeaders['Content-Type'] = 'application/json';
        }

        options.headers = { ...defaultHeaders, ...options.headers };

        try {
            const response = await fetch(url, options);
            if (response.status === 401) {
                showAvatarMessage("Your session has expired. Please log in again.", 5000);
                setTimeout(() => window.location.href = '/login-page', 2000);
                return null;
            }
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            showAvatarMessage("Connection error. Please check your internet.", 4000);
            return null;
        }
    }

    function showModal(modal) { modal.classList.remove('hidden'); }
    function hideModal(modal) { modal.classList.add('hidden'); }

    document.querySelectorAll('.modal-close-icon').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.add('hidden'));
    });
    if (modalBetaCloseBtn) modalBetaCloseBtn.addEventListener('click', () => hideModal(modalBetaWarning));

    // --- SMOOTH TYPING EFFECT ---
    function typewriter(element, text, onComplete = () => {}) {
        element.innerHTML = '';
        const converter = new showdown.Converter({ ghCompatibleHeaderId: true, simpleLineBreaks: true });
        const finalHtml = converter.makeHtml(text);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = finalHtml;
        const allNodes = Array.from(tempDiv.childNodes);
        element.innerHTML = '';

        let i = 0;
        function typeNode() {
            if (i < allNodes.length) {
                element.appendChild(allNodes[i].cloneNode(true));
                i++;
                setTimeout(typeNode, 10);
                if (element.closest('#chat-window')) {
                    chatWindow.scrollTop = chatWindow.scrollHeight;
                }
            } else {
                onComplete();
            }
        }
        typeNode();
    }

    // --- PROACTIVE AVATAR ---
    function showAvatarMessage(message, duration = 5000) {
        if (speechBubbleTimeout) clearTimeout(speechBubbleTimeout);
        avatarSpeechBubble.classList.remove('hidden');
        typewriter(avatarSpeechBubble, message);
        avatarSpeechBubble.classList.add('show');
        speechBubbleTimeout = setTimeout(() => {
            avatarSpeechBubble.classList.remove('show');
        }, duration);
    }

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            const randomTip = STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)];
            showAvatarMessage(randomTip, 7000);
        }, 90000);
    }

    // --- DASHBOARD ---
    async function loadDashboard() {
        const dashboardWelcome = document.getElementById('dashboard-welcome');
        const dashboardDecksList = document.getElementById('dashboard-decks-list');
        dashboardWelcome.textContent = `Welcome back, ${userName.split(' ')[0]}!`;
        const res = await secureFetch('/api/decks');
        if (!res || !res.ok) {
            dashboardDecksList.innerHTML = `<p class="placeholder">Could not load decks.</p>`;
            return;
        }
        const decks = await res.json();
        dashboardDecksList.innerHTML = '';
        if (decks.length === 0) {
            dashboardDecksList.innerHTML = `<p class="placeholder">You haven't created any decks yet. Try the Flashcard Generator!</p>`;
            return;
        }
        decks.slice(0, 3).forEach(deck => {
            const deckEl = document.createElement('div');
            deckEl.className = 'dashboard-deck-item';
            deckEl.textContent = deck.name;
            deckEl.title = `Study "${deck.name}"`;
            deckEl.addEventListener('click', () => {
                unsavedFlashcards = deck.cards;
                currentDeckIsSaved = true;
                flashcardIndex = 0;
                switchMode('flashcard_mode');
            });
            dashboardDecksList.appendChild(deckEl);
        });
    }

    // --- MODE SWITCHING ---
    function switchMode(newMode) {
        if (!newMode) return;
        currentMode = newMode;

        allMainSections.forEach(s => s.classList.add('hidden'));

        allModeButtons.forEach(b => {
            b.classList.toggle("active", b.dataset.mode === newMode);
        });

        if (newMode === "dashboard") {
            dashboardSection.classList.remove('hidden');
            modeSelectorSection.classList.remove('hidden');
            loadDashboard();
        } else {
            const isChatMode = ["homework_helper", "study_guide_maker", "concept_explainer", "pdf_qa"].includes(newMode);
            
            if (isChatMode) {
                chatSection.classList.remove('hidden');
                if (newMode === 'pdf_qa') {
                    pdfUploadSection.classList.remove('hidden');
                }
                const activeButton = document.querySelector(`.mode-selector .mode-btn[data-mode="${newMode}"]`);
                chatModeTitle.textContent = activeButton ? activeButton.innerText.replace(/<.*?>/g, '').trim() : "Conversation";
                if (newMode !== 'pdf_qa' || pdfContext === "") {
                    clearChat();
                }
            } else if (newMode === 'flashcard_mode') {
                flashcardSection.classList.remove('hidden');
                loadFlashcard();
            } else if (newMode === 'quiz_mode') {
                quizSection.classList.remove('hidden');
                resetQuizUI();
                showModal(modalBetaWarning);
            } else if (newMode === 'paper_grader') {
                paperGraderSection.classList.remove('hidden');
                resetPaperGraderUI();
            }
        }
    }

    allModeButtons.forEach((btn) => {
        btn.addEventListener("click", () => switchMode(btn.dataset.mode));
    });
    logoLink.addEventListener("click", (e) => {
        e.preventDefault();
        switchMode('dashboard');
    });

    // --- PERSISTENT DECKS & FLASHCARD ---
    if (myDecksBtn) myDecksBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const deckListContainer = document.getElementById('decks-list');
        deckListContainer.innerHTML = '<p>Loading your decks...</p>';
        showModal(myDecksModal);

        const res = await secureFetch('/api/decks');
        if (!res || !res.ok) {
            deckListContainer.innerHTML = '<p>Could not load your decks. Please try again.</p>';
            return;
        }
        const decks = await res.json();
        deckListContainer.innerHTML = '';
        if (decks.length === 0) {
            deckListContainer.innerHTML = '<p>You have no saved decks.</p>';
            return;
        }

        decks.forEach(deck => {
            const clone = deckItemTemplate.content.cloneNode(true);
            const deckItem = clone.querySelector('.deck-item');
            clone.querySelector('.deck-name').textContent = deck.name;

            clone.querySelector('.study-btn').addEventListener('click', () => {
                unsavedFlashcards = deck.cards;
                currentDeckIsSaved = true;
                flashcardIndex = 0;
                switchMode('flashcard_mode');
                hideModal(myDecksModal);
            });

            clone.querySelector('.delete-btn').addEventListener('click', async () => {
                if (!confirm(`Are you sure you want to delete the deck "${deck.name}"?`)) return;
                const delRes = await secureFetch(`/api/decks/${deck.id}`, { method: 'DELETE' });
                if (delRes && delRes.ok) {
                    deckItem.remove();
                    showAvatarMessage(`Deck "${deck.name}" deleted.`, 3000);
                    if (deckListContainer.children.length === 0) {
                        deckListContainer.innerHTML = '<p>You have no saved decks.</p>';
                    }
                } else {
                    alert('Could not delete deck.');
                }
            });
            deckListContainer.appendChild(clone);
        });
    });

    if (saveDeckBtn) saveDeckBtn.addEventListener('click', () => {
        if (!unsavedFlashcards || unsavedFlashcards.length === 0) return;
        deckNameInput.value = flashcardTopicInput.value || '';
        showModal(saveDeckModal);
        deckNameInput.focus();
    });

    if (saveDeckForm) saveDeckForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const deckName = deckNameInput.value.trim();
        if (!deckName) return;

        const payload = { name: deckName, cards: unsavedFlashcards };
        const res = await secureFetch('/api/decks', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res && res.ok) {
            hideModal(saveDeckModal);
            showAvatarMessage(`Deck "${deckName}" saved successfully!`, 4000);
            currentDeckIsSaved = true;
            saveDeckBtn.classList.add('hidden');
        } else {
            const errData = res ? await res.json() : { error: 'Unknown error' };
            alert(`Error saving deck: ${errData.error}`);
        }
    });

    function resetFlashcardUI() {
        flashcardGenForm.classList.remove('hidden');
        flashcardViewer.classList.add('hidden');
        flashcardStatus.textContent = '';
        flashcardTopicInput.value = '';
        unsavedFlashcards = [];
        flashcardIndex = 0;
        currentDeckIsSaved = false;
        saveDeckBtn.classList.add('hidden');
    }

    if (flashcardCountInput) flashcardCountInput.addEventListener('input', () => flashcardCountDisplay.textContent = flashcardCountInput.value);

    if (flashcardGenForm) flashcardGenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const topic = flashcardTopicInput.value.trim();
        const count = flashcardCountInput.value;
        if (!topic) { flashcardStatus.textContent = "Please enter a topic."; return; }
        flashcardStatus.textContent = "Generating flashcards...";

        const response = await secureFetch('/api/generate-content', { method: 'POST', body: JSON.stringify({ mode: 'flashcard_generator', topic, count }) });
        if (!response) { flashcardStatus.textContent = 'Error contacting server.'; return; }

        const data = await response.json();
        if (!response.ok || !Array.isArray(data) || data.length === 0) {
            flashcardStatus.textContent = `Error: ${data.error || 'The AI did not generate any flashcards.'}`;
            return;
        }
        unsavedFlashcards = data;
        currentDeckIsSaved = false;
        flashcardIndex = 0;
        loadFlashcard();
    });

    function loadFlashcard() {
        if (unsavedFlashcards.length > 0) {
            flashcardGenForm.classList.add('hidden');
            flashcardViewer.classList.remove('hidden');
            flashcardStatus.textContent = '';
            const card = unsavedFlashcards[flashcardIndex];
            flashcardContainer.innerHTML = `<div class="flashcard-inner"><div class="flashcard-front">${card.front}</div><div class="flashcard-back">${card.back}</div></div>`;
            flashcardContainer.classList.remove('is-flipped');
            saveDeckBtn.classList.toggle('hidden', currentDeckIsSaved);
        } else {
            resetFlashcardUI();
        }
    }

    if (flashcardContainer) flashcardContainer.addEventListener("click", () => flashcardContainer.classList.toggle('is-flipped'));
    if (flashcardPrevBtn) flashcardPrevBtn.addEventListener("click", () => {
        flashcardIndex = (flashcardIndex - 1 + unsavedFlashcards.length) % unsavedFlashcards.length;
        loadFlashcard();
    });
    if (flashcardNextBtn) flashcardNextBtn.addEventListener("click", () => {
        flashcardIndex = (flashcardIndex + 1) % unsavedFlashcards.length;
        loadFlashcard();
    });

    // --- CHAT & CONTEXTUAL EXPANSION ---
    function clearChat() {
        conversationHistory = [];
        chatWindow.innerHTML = "";
    }

    function appendMessage(sender, text) {
        const clone = chatMessageTemplate.content.cloneNode(true);
        const messageDiv = clone.querySelector(".message");
        clone.querySelector("strong").textContent = sender === "you" ? "You" : "SchoolSync AI";
        const contentDiv = clone.querySelector('.content');

        if (sender === 'schoolsync-ai' && text) {
             typewriter(contentDiv, text);
        } else if (sender === 'schoolsync-ai') {
             contentDiv.innerHTML = '<span class="typing-cursor"></span>';
        } else {
             const converter = new showdown.Converter({ ghCompatibleHeaderId: true, simpleLineBreaks: true });
             contentDiv.innerHTML = converter.makeHtml(text);
        }

        if (sender === 'schoolsync-ai') {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.title = 'Copy Text';
            copyBtn.innerHTML = '<i class="ph ph-copy"></i>';
            messageDiv.appendChild(copyBtn);
        }
        messageDiv.className = `message ${sender === 'you' ? 'you-message' : 'schoolsync-ai-message'} ${sender === 'system' ? 'system-message' : ''}`;
        chatWindow.appendChild(clone);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return chatWindow.lastElementChild;
    }

    async function submitMessage(question) {
        if (!question) return;
        
        textSelectionPopup.classList.remove('visible');
        if (currentMode === 'dashboard') {
            switchMode('homework_helper');
        }

        conversationHistory.push({ role: "user", content: question });
        appendMessage("you", question);
        userQuestionInput.value = "";
        askButton.disabled = true;
        typingIndicator.classList.remove("hidden");
        aiAvatarImg.src = AVATAR_URLS.thinking;

        const payload = { messages: conversationHistory, mode: currentMode, pdf_context: currentMode === 'pdf_qa' ? pdfContext : undefined };

        const res = await secureFetch("/api/ask-stream", { method: "POST", body: JSON.stringify(payload) });

        typingIndicator.classList.add("hidden");

        if (!res) {
            appendMessage("system", "Error: Could not connect to the server.");
        } else {
            try {
                if (!res.ok) throw new Error((await res.json()).error || "Failed to get response.");
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let aiResponse = "";
                const aiMessageElement = appendMessage('schoolsync-ai', '');
                const aiContentElement = aiMessageElement.querySelector('.content');

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));
                    for (const line of lines) {
                        const jsonStr = line.replace(/^data: /, "");
                        try {
                            const json = JSON.parse(jsonStr);
                            if (json.token) aiResponse += json.token;
                            if (json.error) throw new Error(json.error);
                        } catch { /* ignore */ }
                    }
                }
                typewriter(aiContentElement, aiResponse, () => {
                    conversationHistory.push({ role: "assistant", content: aiResponse });
                });
            } catch (err) {
                appendMessage("system", `Error: ${err.message}`);
            }
        }
        askButton.disabled = false;
        userQuestionInput.focus();
        aiAvatarImg.src = AVATAR_URLS.waving;
    }

    if (chatForm) chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        submitMessage(userQuestionInput.value.trim());
    });
    
    document.addEventListener('mouseup', (e) => {
        if (e.target.closest('#text-selection-popup')) return;

        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText.length > 3 && selection.anchorNode && selection.anchorNode.parentElement.closest('.schoolsync-ai-message .content')) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            textSelectionPopup.style.top = `${rect.top + window.scrollY - textSelectionPopup.offsetHeight - 12}px`;
            textSelectionPopup.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (textSelectionPopup.offsetWidth / 2)}px`;
            textSelectionPopup.classList.add('visible');
        } else {
            textSelectionPopup.classList.remove('visible');
        }
    });

    textSelectionPopup.addEventListener('click', () => {
        const selectedText = window.getSelection().toString().trim();
        if(selectedText){
            const prompt = `Explain this concept in more detail: "${selectedText}"`;
            submitMessage(prompt);
        }
        textSelectionPopup.classList.remove('visible');
    });

    // --- INITIALIZATION ---
    function initializeApp() {
        if (!document.body.dataset.userId) return; // Stop if not on main app page

        userId = document.body.dataset.userId;
        userName = localStorage.getItem(`schoolsync_username_${userId}`) || document.body.dataset.userName || "friend";
        userPicture = localStorage.getItem(`schoolsync_pfp_${userId}`) || document.body.dataset.userPicture;

        const isDarkMode = localStorage.getItem('schoolsync_theme') !== 'light';
        document.documentElement.classList.toggle("dark-mode", isDarkMode);
        themeToggleBtn.querySelector('i').className = isDarkMode ? 'ph-fill ph-sun' : 'ph-fill ph-moon';

        document.getElementById('profile-name-header').textContent = userName;
        document.getElementById('profile-pic-header').src = userPicture;
        document.getElementById('username-input').value = userName;
        
        setTimeout(() => showAvatarMessage(`Hi ${userName.split(' ')[0]}! What are we learning today?`, 6000), 1500);
        ['click', 'mousemove', 'keypress', 'scroll'].forEach(evt => document.addEventListener(evt, resetIdleTimer));
        resetIdleTimer();

        switchMode('dashboard');
        calculator.classList.add('hidden');
        handleTOS();
    }

    // --- TOS HANDLING ---
    function handleTOS() {
        if (localStorage.getItem('schoolsync_tos_accepted') === 'true') {
            appContainer.classList.remove('app-is-blocked');
            return;
        }
        showModal(tosModalOverlay);
        appContainer.classList.add('app-is-blocked');
    }
    if (tosAcceptBtn) tosAcceptBtn.addEventListener('click', () => {
        localStorage.setItem('schoolsync_tos_accepted', 'true');
        hideModal(tosModalOverlay);
        appContainer.classList.remove('app-is-blocked');
    });
    if (tosDeclineBtn) tosDeclineBtn.addEventListener('click', () => {
        hideModal(tosModalOverlay);
        showModal(appBlockedOverlay);
    });
    if (viewTosBtn) viewTosBtn.addEventListener('click', () => {
        hideModal(appBlockedOverlay);
        showModal(tosModalOverlay);
    });

    // --- PROFILE DROPDOWN & SETTINGS ---
    if (profileContainer) {
        profileContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
    }
    document.addEventListener('click', (e) => {
        if (profileDropdown && profileDropdown.classList.contains('active') && !profileContainer.contains(e.target)) {
            profileDropdown.classList.remove('active');
        }
    });

    if (settingsBtn) settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showModal(settingsModal);
    });

    if (settingsForm) settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(settingsForm);
        const newUsername = formData.get('username').trim();
        const pfpFile = formData.get('pfp-file');

        // Handle username update
        if (newUsername && newUsername !== userName) {
            userName = newUsername;
            localStorage.setItem(`schoolsync_username_${userId}`, newUsername);
            document.getElementById('profile-name-header').textContent = newUsername;
        }

        // Handle PFP upload
        if (pfpFile && pfpFile.size > 0) {
            const pfpFormData = new FormData();
            pfpFormData.append('pfp-file', pfpFile);

            const res = await secureFetch('/api/upload-pfp', {
                method: 'POST',
                body: pfpFormData
            });

            if (res && res.ok) {
                const data = await res.json();
                userPicture = data.filepath;
                localStorage.setItem(`schoolsync_pfp_${userId}`, userPicture);
                document.getElementById('profile-pic-header').src = userPicture;
            } else {
                alert('Profile picture upload failed.');
            }
        }
        
        hideModal(settingsModal);
        showAvatarMessage("Settings saved!", 3000);
    });

    // --- PAPER GRADER ---
    function updatePaperGraderUI() {
        gradeSelectorContainer.querySelectorAll('.selector-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.value === selectedGrade));
        typeSelectorContainer.querySelectorAll('.selector-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.value === selectedPaperType));
    }
    function resetPaperGraderUI() {
        selectedGrade = "Grade 9";
        selectedPaperType = "Narrative";
        updatePaperGraderUI();
        paperGraderText.value = '';
        paperGraderResults.innerHTML = '';
        paperGraderStatus.textContent = '';
    }
    if (gradeSelectorContainer) gradeSelectorContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.selector-btn');
        if (button) { selectedGrade = button.dataset.value; updatePaperGraderUI(); }
    });
    if (typeSelectorContainer) typeSelectorContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.selector-btn');
        if (button) { selectedPaperType = button.dataset.value; updatePaperGraderUI(); }
    });
    if (paperGraderForm) paperGraderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const paper_text = paperGraderText.value.trim();
        if (!paper_text) { paperGraderStatus.textContent = 'Please paste your paper into the text box.'; return; }
        paperGraderStatus.textContent = 'AI is grading your paper...';
        const response = await secureFetch('/api/grade-paper', { method: 'POST', body: JSON.stringify({ grade_level: selectedGrade, paper_type: selectedPaperType, paper_text }) });
        if (!response) { paperGraderStatus.textContent = 'Error contacting server.'; return; }
        const data = await response.json();
        if (!response.ok) { paperGraderStatus.textContent = `Error: ${data.error || 'An unknown error occurred.'}`; return; }
        paperGraderStatus.textContent = 'Grading Complete!';
        const createHtmlList = (items) => items.map(item => `<li>${item}</li>`).join('');
        paperGraderResults.innerHTML = `
            <div class="grader-result-block"><button class="copy-btn" title="Copy Assessment"><i class="ph ph-copy"></i></button><div class="copy-content"><h4>Overall Assessment</h4><p>${data.assessment}</p><p><strong>Estimated Grade Level:</strong> ${data.estimated_grade_level}</p></div></div>
            <div class="grader-result-block"><button class="copy-btn" title="Copy Strengths"><i class="ph ph-copy"></i></button><div class="copy-content"><h4>Strengths</h4><ul>${createHtmlList(data.strengths)}</ul></div></div>
            <div class="grader-result-block"><button class="copy-btn" title="Copy Suggestions"><i class="ph ph-copy"></i></button><div class="copy-content"><h4>Suggestions for Improvement</h4><ul>${createHtmlList(data.suggestions)}</ul></div></div>`;
    });

    // --- QUIZ LOGIC ---
    function resetQuizUI() {
        quizGenForm.classList.remove('hidden');
        quizViewer.classList.add('hidden');
        quizReviewSection.classList.add('hidden');
        quizStatus.textContent = '';
        quizTopicInput.value = '';
        quizQuestions = [];
        userAnswers = [];
        quizCurrentIndex = 0;
    }
    if (quizQuestionCountInput) quizQuestionCountInput.addEventListener('input', () => {
        quizCountDisplay.textContent = quizQuestionCountInput.value;
    });
    if (quizGenForm) quizGenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const topic = quizTopicInput.value.trim();
        const count = quizQuestionCountInput.value;
        if (!topic) { quizStatus.textContent = "Please enter a topic."; return; }
        quizStatus.textContent = "Generating quiz... this may take a moment.";
        try {
            const response = await secureFetch('/api/generate-content', { method: 'POST', body: JSON.stringify({ mode: 'quiz_generator', topic, count }) });
            if (!response) return;
            const data = await response.json();
            if (!response.ok || !Array.isArray(data) || data.length === 0) {
                throw new Error(data.error || 'The AI did not generate any valid questions.');
            }
            quizQuestions = data;
            userAnswers = new Array(quizQuestions.length).fill(null);
            quizCurrentIndex = 0;
            quizGenForm.classList.add('hidden');
            quizViewer.classList.remove('hidden');
            quizReviewSection.classList.add('hidden');
            loadQuizQuestion();
        } catch (err) {
            quizStatus.textContent = `Error: ${err.message}`;
        }
    });
    function loadQuizQuestion() {
        const q = quizQuestions[quizCurrentIndex];
        quizQuestionContainer.textContent = q.question.replace('___', '______');
        quizProgress.textContent = `Question ${quizCurrentIndex + 1} of ${quizQuestions.length}`;
        quizOptionsFieldset.innerHTML = "";
        switch (q.type) {
            case 'multiple_choice':
                Object.entries(q.options).forEach(([key, text]) => {
                    const optionId = `option-${key}`;
                    const label = document.createElement("label");
                    label.htmlFor = optionId;
                    const isChecked = userAnswers[quizCurrentIndex] === key;
                    label.innerHTML = `<input type="radio" name="quiz-option" id="${optionId}" value="${key}" ${isChecked ? 'checked' : ''}> ${text}`;
                    quizOptionsFieldset.appendChild(label);
                });
                break;
            case 'fill_in_the_blank':
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'fill-in-blank-input';
                input.placeholder = 'Type your answer here...';
                input.value = userAnswers[quizCurrentIndex] || '';
                quizOptionsFieldset.appendChild(input);
                break;
        }
        quizPrevBtn.disabled = quizCurrentIndex === 0;
        quizNextBtn.textContent = (quizCurrentIndex === quizQuestions.length - 1) ? 'Submit Quiz' : 'Next';
    }
    if (quizOptionsFieldset) quizOptionsFieldset.addEventListener('input', (e) => {
        if (e.target.name === 'quiz-option' || e.target.classList.contains('fill-in-blank-input')) {
            userAnswers[quizCurrentIndex] = e.target.value;
        }
    });
    if (quizPrevBtn) quizPrevBtn.addEventListener('click', () => {
        if (quizCurrentIndex > 0) {
            quizCurrentIndex--;
            loadQuizQuestion();
        }
    });
    if (quizNextBtn) quizNextBtn.addEventListener('click', () => {
        if (quizNextBtn.textContent === 'Submit Quiz') {
            showQuizReview();
        } else {
            quizCurrentIndex++;
            loadQuizQuestion();
        }
    });
    function showQuizReview() {
        quizViewer.classList.add('hidden');
        quizReviewSection.classList.remove('hidden');
        quizReviewContainer.innerHTML = "";
        let score = 0;
        quizQuestions.forEach((q, index) => {
            const userAnswer = userAnswers[index];
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            let isCorrect, contentHtml;
            const compareStrings = (str1, str2) => {
                if (typeof str1 !== 'string' || typeof str2 !== 'string') return false;
                return str1.toLowerCase().trim() === str2.toLowerCase().trim();
            };
            if (q.type === 'multiple_choice') {
                isCorrect = userAnswer === q.correctAnswer;
            } else {
                isCorrect = compareStrings(userAnswer, q.correctAnswer);
            }
            if (q.type === 'multiple_choice') {
                let optionsHtml = '';
                Object.entries(q.options).forEach(([key, text]) => {
                    let className = 'review-option';
                    const isTheCorrectAnswer = key === q.correctAnswer;
                    const isTheUserChoice = key === userAnswer;
                    if (isTheCorrectAnswer) className += ' correct-answer';
                    if (isTheUserChoice && !isTheCorrectAnswer) className += ' user-choice incorrect';
                    optionsHtml += `<div class="${className}">${key.toUpperCase()}: ${text}</div>`;
                });
                contentHtml = `<div class="review-options">${optionsHtml}</div>`;
            } else {
                contentHtml = `
                    <div class="review-fill-in-blank ${isCorrect ? 'correct-answer' : 'incorrect'}">
                        Your answer: <strong>${userAnswer || '(No answer)'}</strong>
                    </div>
                    ${!isCorrect ? `<div class="review-fill-in-blank correct-answer">Correct answer: <strong>${q.correctAnswer}</strong></div>` : ''}
                `;
            }
            if (isCorrect) score++;
            reviewItem.innerHTML = `<p class="review-question">${index + 1}. ${q.question.replace('___', '______')}</p>${contentHtml}<p class="review-explanation"><strong>Explanation:</strong> ${q.explanation}</p>`;
            quizReviewContainer.appendChild(reviewItem);
        });
        quizResultsHeader.textContent = `Quiz Results: You scored ${score} out of ${quizQuestions.length}`;
    }
    if (takeNewQuizBtn) takeNewQuizBtn.addEventListener('click', resetQuizUI);

    // --- PDF UPLOAD ---
    if (uploadForm) uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (pdfFileInput.files.length === 0) {
            uploadStatus.textContent = "Please select a PDF file.";
            return;
        }
        uploadStatus.textContent = "Uploading and processing...";
        const formData = new FormData();
        formData.append("pdf-file", pdfFileInput.files[0]);
        try {
            const res = await secureFetch("/api/upload-pdf", { method: "POST", body: formData });
            if (!res) return;
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            uploadStatus.textContent = `✅ PDF "${json.filename}" loaded. You can now ask questions.`;
            pdfContext = json.pdf_context;
            clearChat();
        } catch (err) {
            uploadStatus.textContent = `Error: ${err.message}`;
        }
    });

    // --- CALCULATOR ---
    let calcExpression = "";
    if (toggleCalculatorBtn) toggleCalculatorBtn.addEventListener('click', () => calculator.classList.toggle('hidden'));
    if (closeCalculatorBtn) closeCalculatorBtn.addEventListener('click', () => calculator.classList.add('hidden'));
    if (calcButtons) calcButtons.forEach(btn => btn.addEventListener("click", () => { calcExpression += btn.dataset.value; calcDisplay.value = calcExpression; }));
    if (calcClearBtn) calcClearBtn.addEventListener("click", () => { calcExpression = ""; calcDisplay.value = ""; });
    if (calcEqualsBtn) calcEqualsBtn.addEventListener("click", () => { try { if (/^[0-9+\-*/. ()]+$/.test(calcExpression)) { const result = eval(calcExpression); calcDisplay.value = result; calcExpression = String(result); } else { calcDisplay.value = "Error"; calcExpression = ""; } } catch { calcDisplay.value = "Error"; calcExpression = ""; } });
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
    if (calculatorHeader) calculatorHeader.addEventListener("mousedown", (e) => { isDragging = true; dragOffsetX = e.clientX - calculator.offsetLeft; dragOffsetY = e.clientY - calculator.offsetTop; calculator.style.cursor = "grabbing"; document.body.style.userSelect = "none"; });
    document.addEventListener("mousemove", (e) => { if (!isDragging) return; e.preventDefault(); calculator.style.left = `${e.clientX - dragOffsetX}px`; calculator.style.top = `${e.clientY - dragOffsetY}px`; });
    document.addEventListener("mouseup", () => { if (isDragging) { isDragging = false; calculator.style.cursor = "grab"; document.body.style.userSelect = ""; } });

    // --- THEME TOGGLE ---
    if (themeToggleBtn) themeToggleBtn.addEventListener("click", () => {
        const isDarkMode = document.documentElement.classList.toggle("dark-mode");
        themeToggleBtn.querySelector('i').className = isDarkMode ? 'ph-fill ph-sun' : 'ph-fill ph-moon';
        localStorage.setItem('schoolsync_theme', isDarkMode ? 'dark' : 'light');
    });

    // --- PDF EXPORT ---
    if (exportPdfBtn) exportPdfBtn.addEventListener("click", async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 15;
        const margin = 10;
        const maxLineWidth = doc.internal.pageSize.getWidth() - margin * 2;
        doc.setFont("helvetica", "normal");
        document.querySelectorAll("#chat-window .message:not(.system-message)").forEach(msg => {
            if (y > 280) { doc.addPage(); y = 15; }
            doc.setFont("helvetica", "bold");
            doc.text(`${msg.querySelector("strong").textContent}:`, margin, y);
            y += 6;
            doc.setFont("helvetica", "normal");
            const textLines = doc.splitTextToSize(msg.querySelector(".content").innerText, maxLineWidth);
            doc.text(textLines, margin, y);
            y += (textLines.length * 5) + 8;
        });
        doc.save("SchoolSyncAI_Chat_Export.pdf");
    });

    if (clearChatBtn) clearChatBtn.addEventListener("click", clearChat);

    // --- COPY BUTTON EVENT LISTENER (GLOBAL) ---
    document.body.addEventListener('click', e => {
        const copyBtn = e.target.closest('.copy-btn');
        if (copyBtn) {
            const contentContainer = copyBtn.closest('.message, .grader-result-block');
            const contentToCopy = contentContainer.querySelector('.content, .copy-content').innerText;

            navigator.clipboard.writeText(contentToCopy).then(() => {
                const icon = copyBtn.querySelector('i');
                icon.className = 'ph-fill ph-check';
                setTimeout(() => { icon.className = 'ph ph-copy'; }, 2000);
            }).catch(err => console.error('Failed to copy text: ', err));
        }
    });

    // START THE APP
    initializeApp();
});