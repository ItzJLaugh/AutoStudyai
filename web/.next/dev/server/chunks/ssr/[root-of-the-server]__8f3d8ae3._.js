module.exports = [
"[project]/lib/auth.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useRequireAuth",
    ()=>useRequireAuth
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.js [ssr] (ecmascript)");
;
;
;
function useRequireAuth() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const [checked, setChecked] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["getToken"])()) {
            router.push('/');
        } else {
            setChecked(true);
        }
    }, []);
    return {
        ready: checked,
        email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["getUserEmail"])()
    };
}
}),
"[project]/lib/formatters.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Parse "Q1: ...\nA1: ..." text into [{index, question, answer}]
 */ __turbopack_context__.s([
    "formatDate",
    ()=>formatDate,
    "parseNotes",
    ()=>parseNotes,
    "parseQAPairs",
    ()=>parseQAPairs
]);
function parseQAPairs(text) {
    if (!text) return [];
    const pairs = [];
    const lines = text.split('\n');
    let currentQ = null;
    for (const line of lines){
        const qMatch = line.match(/^Q(\d+):\s*(.+)/);
        const aMatch = line.match(/^A(\d+):\s*(.+)/);
        if (qMatch) {
            currentQ = {
                index: parseInt(qMatch[1]),
                question: qMatch[2].trim()
            };
        } else if (aMatch && currentQ) {
            pairs.push({
                ...currentQ,
                answer: aMatch[2].trim()
            });
            currentQ = null;
        }
    }
    return pairs;
}
function parseNotes(text) {
    if (!text) return [];
    return text.split('\n').map((l)=>l.trim()).filter((l)=>l.startsWith('- ')).map((l)=>l.substring(2));
}
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}
}),
"[project]/components/FlashcardViewer.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>FlashcardViewer
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.js [ssr] (ecmascript)");
;
;
;
function FlashcardViewer({ flashcards, guideId, onComplete }) {
    const [currentIndex, setCurrentIndex] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    const [isFlipped, setIsFlipped] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [known, setKnown] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [unknown, setUnknown] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [done, setDone] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const startTime = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(Date.now());
    function flip() {
        setIsFlipped(!isFlipped);
    }
    function markKnown() {
        const newKnown = [
            ...known,
            currentIndex
        ];
        setKnown(newKnown);
        advance(newKnown, unknown);
    }
    function markUnknown() {
        const newUnknown = [
            ...unknown,
            currentIndex
        ];
        setUnknown(newUnknown);
        advance(known, newUnknown);
    }
    function advance(k, u) {
        setIsFlipped(false);
        const seen = new Set([
            ...k,
            ...u
        ]);
        if (seen.size >= flashcards.length) {
            finish(k, u);
            return;
        }
        for(let i = currentIndex + 1; i < flashcards.length; i++){
            if (!seen.has(i)) {
                setCurrentIndex(i);
                return;
            }
        }
        for(let i = 0; i < currentIndex; i++){
            if (!seen.has(i)) {
                setCurrentIndex(i);
                return;
            }
        }
    }
    async function finish(k, u) {
        setDone(true);
        const elapsed = Math.round((Date.now() - startTime.current) / 1000);
        if (guideId) {
            await Promise.all([
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/guides/' + guideId + '/flashcard-progress', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        known: k,
                        unknown: u,
                        last_studied: new Date().toISOString()
                    })
                }),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/stats/log-session', {
                    method: 'POST',
                    body: JSON.stringify({
                        guide_id: guideId,
                        session_type: 'flashcard',
                        duration_seconds: elapsed,
                        metadata: {
                            cards_studied: flashcards.length,
                            cards_correct: k.length
                        }
                    })
                })
            ]);
        }
        if (onComplete) onComplete({
            known: k,
            unknown: u
        });
    }
    function studyUnknown() {
        setDone(false);
        setCurrentIndex(unknown[0] || 0);
        setKnown([]);
        setUnknown([]);
        startTime.current = Date.now();
    }
    if (done) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            className: "completion-card",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "completion-icon",
                    children: "🎉"
                }, void 0, false, {
                    fileName: "[project]/components/FlashcardViewer.js",
                    lineNumber: 76,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "completion-title",
                    children: "Session Complete!"
                }, void 0, false, {
                    fileName: "[project]/components/FlashcardViewer.js",
                    lineNumber: 77,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "completion-stat",
                    children: [
                        known.length,
                        "/",
                        flashcards.length
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/FlashcardViewer.js",
                    lineNumber: 78,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "completion-detail",
                    children: "cards mastered"
                }, void 0, false, {
                    fileName: "[project]/components/FlashcardViewer.js",
                    lineNumber: 79,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    style: {
                        marginTop: 12
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "progress-bar-container",
                        style: {
                            height: 8
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "progress-bar-fill green",
                            style: {
                                width: known.length / flashcards.length * 100 + '%'
                            }
                        }, void 0, false, {
                            fileName: "[project]/components/FlashcardViewer.js",
                            lineNumber: 82,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/FlashcardViewer.js",
                        lineNumber: 81,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/FlashcardViewer.js",
                    lineNumber: 80,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "completion-actions",
                    children: [
                        unknown.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            className: "btn",
                            onClick: studyUnknown,
                            children: [
                                "Study ",
                                unknown.length,
                                " Missed Cards"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/FlashcardViewer.js",
                            lineNumber: 87,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            className: "btn-outline",
                            onClick: ()=>window.history.back(),
                            children: "Done"
                        }, void 0, false, {
                            fileName: "[project]/components/FlashcardViewer.js",
                            lineNumber: 91,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/FlashcardViewer.js",
                    lineNumber: 85,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/FlashcardViewer.js",
            lineNumber: 75,
            columnNumber: 7
        }, this);
    }
    const card = flashcards[currentIndex];
    const progress = (known.length + unknown.length) / flashcards.length;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "progress-bar-container",
                style: {
                    marginBottom: 16
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "progress-bar-fill",
                    style: {
                        width: progress * 100 + '%'
                    }
                }, void 0, false, {
                    fileName: "[project]/components/FlashcardViewer.js",
                    lineNumber: 103,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/FlashcardViewer.js",
                lineNumber: 102,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "flashcard-progress",
                children: [
                    "Card ",
                    known.length + unknown.length + 1,
                    " of ",
                    flashcards.length
                ]
            }, void 0, true, {
                fileName: "[project]/components/FlashcardViewer.js",
                lineNumber: 105,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "flashcard-container",
                onClick: flip,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: 'flashcard-inner' + (isFlipped ? ' flipped' : ''),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "flashcard-face flashcard-front",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "flashcard-label",
                                    children: "Question"
                                }, void 0, false, {
                                    fileName: "[project]/components/FlashcardViewer.js",
                                    lineNumber: 112,
                                    columnNumber: 13
                                }, this),
                                card.front
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/FlashcardViewer.js",
                            lineNumber: 111,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "flashcard-face flashcard-back",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "flashcard-label",
                                    children: "Answer"
                                }, void 0, false, {
                                    fileName: "[project]/components/FlashcardViewer.js",
                                    lineNumber: 116,
                                    columnNumber: 13
                                }, this),
                                card.back
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/FlashcardViewer.js",
                            lineNumber: 115,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/FlashcardViewer.js",
                    lineNumber: 110,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/FlashcardViewer.js",
                lineNumber: 109,
                columnNumber: 7
            }, this),
            !isFlipped ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                style: {
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.85em',
                    marginTop: 12
                },
                children: "Click card to reveal answer"
            }, void 0, false, {
                fileName: "[project]/components/FlashcardViewer.js",
                lineNumber: 123,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "flashcard-actions",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        className: "fc-btn fc-btn-again",
                        onClick: markUnknown,
                        children: "Study Again"
                    }, void 0, false, {
                        fileName: "[project]/components/FlashcardViewer.js",
                        lineNumber: 128,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        className: "fc-btn fc-btn-know",
                        onClick: markKnown,
                        children: "Got It"
                    }, void 0, false, {
                        fileName: "[project]/components/FlashcardViewer.js",
                        lineNumber: 129,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/FlashcardViewer.js",
                lineNumber: 127,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/FlashcardViewer.js",
        lineNumber: 101,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/QuizMode.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>QuizMode
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.js [ssr] (ecmascript)");
;
;
;
function QuizMode({ questions, guideId, onComplete }) {
    const [currentIndex, setCurrentIndex] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    const [selected, setSelected] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [answered, setAnswered] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [answers, setAnswers] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [done, setDone] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [score, setScore] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const q = questions[currentIndex];
    function selectOption(i) {
        if (answered) return;
        setSelected(i);
        setAnswered(true);
        const isCorrect = i === q.correct_index;
        const newAnswers = [
            ...answers,
            {
                question_index: currentIndex,
                selected: i,
                correct: q.correct_index,
                is_correct: isCorrect
            }
        ];
        setAnswers(newAnswers);
        setTimeout(()=>{
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(currentIndex + 1);
                setSelected(null);
                setAnswered(false);
            } else {
                submitQuiz(newAnswers);
            }
        }, 1200);
    }
    async function submitQuiz(finalAnswers) {
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/quiz/' + guideId + '/submit', {
            method: 'POST',
            body: JSON.stringify({
                answers: finalAnswers
            })
        });
        setScore(data);
        setDone(true);
        if (onComplete) onComplete(data);
    }
    function retake() {
        setCurrentIndex(0);
        setSelected(null);
        setAnswered(false);
        setAnswers([]);
        setDone(false);
        setScore(null);
    }
    if (done && score) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            className: "quiz-result",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "quiz-score",
                    children: [
                        score.score,
                        "%"
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/QuizMode.js",
                    lineNumber: 61,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "quiz-score-label",
                    children: "Quiz Score"
                }, void 0, false, {
                    fileName: "[project]/components/QuizMode.js",
                    lineNumber: 62,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "quiz-breakdown",
                    children: [
                        score.correct,
                        " out of ",
                        score.total,
                        " correct"
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/QuizMode.js",
                    lineNumber: 63,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "completion-actions",
                    style: {
                        marginTop: 20
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            className: "btn",
                            onClick: retake,
                            children: "Retake Quiz"
                        }, void 0, false, {
                            fileName: "[project]/components/QuizMode.js",
                            lineNumber: 67,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            className: "btn-outline",
                            onClick: ()=>window.history.back(),
                            children: "Back to Guide"
                        }, void 0, false, {
                            fileName: "[project]/components/QuizMode.js",
                            lineNumber: 68,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/QuizMode.js",
                    lineNumber: 66,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/QuizMode.js",
            lineNumber: 60,
            columnNumber: 7
        }, this);
    }
    function optionClass(i) {
        if (!answered) return 'quiz-option' + (selected === i ? ' selected' : '');
        if (i === q.correct_index) return 'quiz-option correct';
        if (i === selected && i !== q.correct_index) return 'quiz-option wrong';
        return 'quiz-option disabled';
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "quiz-question-card",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "quiz-counter",
                children: [
                    "Question ",
                    currentIndex + 1,
                    " of ",
                    questions.length
                ]
            }, void 0, true, {
                fileName: "[project]/components/QuizMode.js",
                lineNumber: 83,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "progress-bar-container",
                style: {
                    marginBottom: 16
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "progress-bar-fill",
                    style: {
                        width: currentIndex / questions.length * 100 + '%'
                    }
                }, void 0, false, {
                    fileName: "[project]/components/QuizMode.js",
                    lineNumber: 85,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/QuizMode.js",
                lineNumber: 84,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "quiz-question-text",
                children: q.question
            }, void 0, false, {
                fileName: "[project]/components/QuizMode.js",
                lineNumber: 87,
                columnNumber: 7
            }, this),
            q.options.map((opt, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                    className: optionClass(i),
                    onClick: ()=>selectOption(i),
                    children: opt
                }, i, false, {
                    fileName: "[project]/components/QuizMode.js",
                    lineNumber: 89,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/components/QuizMode.js",
        lineNumber: 82,
        columnNumber: 5
    }, this);
}
}),
"[project]/pages/guide/[id].js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>GuidePage
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$formatters$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/formatters.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$FlashcardViewer$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/FlashcardViewer.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$QuizMode$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/QuizMode.js [ssr] (ecmascript)");
;
;
;
;
;
;
;
;
function GuidePage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const { id } = router.query;
    const { ready } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["useRequireAuth"])();
    const [guide, setGuide] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('guide');
    const [revealedQs, setRevealedQs] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(new Set());
    const [quizHistory, setQuizHistory] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const prevRevealed = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(0);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (ready && id) {
            loadGuide();
            loadQuizHistory();
        }
    }, [
        ready,
        id
    ]);
    // Save read progress when revealed count changes
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!guide || !id) return;
        const qaPairs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$formatters$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["parseQAPairs"])(guide.study_guide);
        if (qaPairs.length === 0) return;
        const progress = revealedQs.size / qaPairs.length;
        if (revealedQs.size > prevRevealed.current) {
            prevRevealed.current = revealedQs.size;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/guides/' + id + '/read-progress', {
                method: 'PATCH',
                body: JSON.stringify({
                    read_progress: progress
                })
            });
        }
    }, [
        revealedQs
    ]);
    async function loadGuide() {
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/guides/' + id);
        if (data?.guide) setGuide(data.guide);
    }
    async function loadQuizHistory() {
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/quiz/' + id + '/history');
        if (data?.attempts) setQuizHistory(data.attempts);
    }
    async function toggleBookmark() {
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/guides/' + id + '/bookmark', {
            method: 'PATCH'
        });
        if (data) setGuide((prev)=>({
                ...prev,
                is_bookmarked: data.is_bookmarked
            }));
    }
    function toggleQA(index) {
        setRevealedQs((prev)=>{
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    }
    if (!guide) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        style: {
            padding: 40,
            color: 'var(--text-muted)'
        },
        children: "Loading..."
    }, void 0, false, {
        fileName: "[project]/pages/guide/[id].js",
        lineNumber: 65,
        columnNumber: 22
    }, this);
    const qaPairs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$formatters$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["parseQAPairs"])(guide.study_guide);
    const notes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$formatters$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["parseNotes"])(guide.notes);
    const flashcards = guide.flashcards || [];
    const fcProgress = guide.flashcard_progress || {};
    const readPct = Math.round((guide.read_progress || 0) * 100);
    const fcPct = flashcards.length > 0 && fcProgress.known ? Math.round(fcProgress.known.length / flashcards.length * 100) : 0;
    const bestQuiz = quizHistory.length > 0 ? Math.max(...quizHistory.map((a)=>a.score)) : null;
    const tabs = [
        {
            key: 'guide',
            label: 'Study Guide'
        },
        {
            key: 'notes',
            label: 'Notes'
        },
        {
            key: 'flashcards',
            label: `Flashcards (${flashcards.length})`
        },
        {
            key: 'quiz',
            label: 'Quiz'
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "fade-in",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 4
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("a", {
                                href: "#",
                                onClick: (e)=>{
                                    e.preventDefault();
                                    router.back();
                                },
                                style: {
                                    fontSize: '0.85em',
                                    color: 'var(--text-muted)'
                                },
                                children: "← Back"
                            }, void 0, false, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 88,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                                style: {
                                    marginTop: 8
                                },
                                children: guide.title
                            }, void 0, false, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 91,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                style: {
                                    color: 'var(--text-muted)',
                                    fontSize: '0.85em',
                                    marginTop: 4
                                },
                                children: [
                                    guide.source_url && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: [
                                            guide.source_url.substring(0, 60),
                                            guide.source_url.length > 60 ? '...' : '',
                                            " | "
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/guide/[id].js",
                                        lineNumber: 93,
                                        columnNumber: 34
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        className: "timestamp",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$formatters$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["formatDate"])(guide.created_at)
                                    }, void 0, false, {
                                        fileName: "[project]/pages/guide/[id].js",
                                        lineNumber: 94,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 92,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/guide/[id].js",
                        lineNumber: 87,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        className: 'bookmark-btn' + (guide.is_bookmarked ? ' active' : ''),
                        onClick: toggleBookmark,
                        style: {
                            fontSize: '1.6em',
                            marginTop: 8
                        },
                        children: guide.is_bookmarked ? '\u2605' : '\u2606'
                    }, void 0, false, {
                        fileName: "[project]/pages/guide/[id].js",
                        lineNumber: 97,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/guide/[id].js",
                lineNumber: 86,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "guide-progress",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "guide-progress-item",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "guide-progress-label",
                                children: "Read Progress"
                            }, void 0, false, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 105,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "progress-bar-container",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "progress-bar-fill",
                                    style: {
                                        width: readPct + '%'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/pages/guide/[id].js",
                                    lineNumber: 106,
                                    columnNumber: 51
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 106,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "guide-progress-value",
                                style: {
                                    marginTop: 4
                                },
                                children: [
                                    readPct,
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 107,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/guide/[id].js",
                        lineNumber: 104,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "guide-progress-item",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "guide-progress-label",
                                children: "Flashcard Mastery"
                            }, void 0, false, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 110,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "progress-bar-container",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "progress-bar-fill green",
                                    style: {
                                        width: fcPct + '%'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/pages/guide/[id].js",
                                    lineNumber: 111,
                                    columnNumber: 51
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 111,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "guide-progress-value",
                                style: {
                                    marginTop: 4
                                },
                                children: [
                                    fcPct,
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 112,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/guide/[id].js",
                        lineNumber: 109,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "guide-progress-item",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "guide-progress-label",
                                children: "Best Quiz Score"
                            }, void 0, false, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 115,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "guide-progress-value",
                                style: {
                                    fontSize: '1.2em'
                                },
                                children: bestQuiz !== null ? bestQuiz + '%' : '--'
                            }, void 0, false, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 116,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/guide/[id].js",
                        lineNumber: 114,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/guide/[id].js",
                lineNumber: 103,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "tabs",
                children: tabs.map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        className: 'tab-btn' + (activeTab === tab.key ? ' active' : ''),
                        onClick: ()=>setActiveTab(tab.key),
                        children: tab.label
                    }, tab.key, false, {
                        fileName: "[project]/pages/guide/[id].js",
                        lineNumber: 123,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/pages/guide/[id].js",
                lineNumber: 121,
                columnNumber: 7
            }, this),
            activeTab === 'guide' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                children: qaPairs.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "guide-content",
                    children: guide.study_guide || 'No study guide content.'
                }, void 0, false, {
                    fileName: "[project]/pages/guide/[id].js",
                    lineNumber: 137,
                    columnNumber: 13
                }, this) : qaPairs.map((pair, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "qa-item",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "qa-question",
                                onClick: ()=>toggleQA(i),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: [
                                            "Q",
                                            pair.index,
                                            ": ",
                                            pair.question
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/guide/[id].js",
                                        lineNumber: 142,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        className: 'qa-chevron' + (revealedQs.has(i) ? ' open' : ''),
                                        children: '\u25BC'
                                    }, void 0, false, {
                                        fileName: "[project]/pages/guide/[id].js",
                                        lineNumber: 143,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 141,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: 'qa-answer' + (revealedQs.has(i) ? ' visible' : ''),
                                children: pair.answer
                            }, void 0, false, {
                                fileName: "[project]/pages/guide/[id].js",
                                lineNumber: 145,
                                columnNumber: 17
                            }, this)
                        ]
                    }, i, true, {
                        fileName: "[project]/pages/guide/[id].js",
                        lineNumber: 140,
                        columnNumber: 15
                    }, this))
            }, void 0, false, {
                fileName: "[project]/pages/guide/[id].js",
                lineNumber: 135,
                columnNumber: 9
            }, this),
            activeTab === 'notes' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "guide-content",
                children: notes.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                    style: {
                        color: 'var(--text-muted)'
                    },
                    children: "No notes available."
                }, void 0, false, {
                    fileName: "[project]/pages/guide/[id].js",
                    lineNumber: 157,
                    columnNumber: 13
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("ul", {
                    className: "notes-list",
                    children: notes.map((note, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                            children: note
                        }, i, false, {
                            fileName: "[project]/pages/guide/[id].js",
                            lineNumber: 160,
                            columnNumber: 39
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/pages/guide/[id].js",
                    lineNumber: 159,
                    columnNumber: 13
                }, this)
            }, void 0, false, {
                fileName: "[project]/pages/guide/[id].js",
                lineNumber: 155,
                columnNumber: 9
            }, this),
            activeTab === 'flashcards' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                children: flashcards.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "empty-state",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "empty-state-icon",
                            children: "🃏"
                        }, void 0, false, {
                            fileName: "[project]/pages/guide/[id].js",
                            lineNumber: 170,
                            columnNumber: 15
                        }, this),
                        "No flashcards for this guide."
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/guide/[id].js",
                    lineNumber: 169,
                    columnNumber: 13
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                            style: {
                                color: 'var(--text-secondary)',
                                marginBottom: 16
                            },
                            children: [
                                flashcards.length,
                                " flashcards available.",
                                fcProgress.known && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                    children: [
                                        " ",
                                        fcProgress.known.length,
                                        " mastered."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/guide/[id].js",
                                    lineNumber: 177,
                                    columnNumber: 38
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/guide/[id].js",
                            lineNumber: 175,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            className: "btn",
                            onClick: ()=>router.push('/flashcards/study?guideId=' + id),
                            children: "Start Study Session"
                        }, void 0, false, {
                            fileName: "[project]/pages/guide/[id].js",
                            lineNumber: 179,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            style: {
                                marginTop: 20
                            },
                            children: [
                                flashcards.slice(0, 5).map((fc, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "fc-hub-card",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: 'var(--text-primary)'
                                                },
                                                children: fc.front
                                            }, void 0, false, {
                                                fileName: "[project]/pages/guide/[id].js",
                                                lineNumber: 185,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: 'var(--text-muted)',
                                                    fontSize: '0.8em'
                                                },
                                                children: [
                                                    "Card ",
                                                    i + 1
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/guide/[id].js",
                                                lineNumber: 186,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/pages/guide/[id].js",
                                        lineNumber: 184,
                                        columnNumber: 19
                                    }, this)),
                                flashcards.length > 5 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                    style: {
                                        color: 'var(--text-muted)',
                                        fontSize: '0.85em',
                                        marginTop: 8
                                    },
                                    children: [
                                        "+",
                                        flashcards.length - 5,
                                        " more cards"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/guide/[id].js",
                                    lineNumber: 190,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/guide/[id].js",
                            lineNumber: 182,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/guide/[id].js",
                    lineNumber: 174,
                    columnNumber: 13
                }, this)
            }, void 0, false, {
                fileName: "[project]/pages/guide/[id].js",
                lineNumber: 167,
                columnNumber: 9
            }, this),
            activeTab === 'quiz' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                children: qaPairs.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "empty-state",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "empty-state-icon",
                            children: "📝"
                        }, void 0, false, {
                            fileName: "[project]/pages/guide/[id].js",
                            lineNumber: 204,
                            columnNumber: 15
                        }, this),
                        "No Q&A pairs to generate a quiz from."
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/guide/[id].js",
                    lineNumber: 203,
                    columnNumber: 13
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                            style: {
                                color: 'var(--text-secondary)',
                                marginBottom: 16
                            },
                            children: [
                                "Quiz generated from ",
                                qaPairs.length,
                                " questions in your study guide."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/guide/[id].js",
                            lineNumber: 209,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            className: "btn",
                            onClick: ()=>router.push('/quiz/' + id),
                            children: "Start Quiz"
                        }, void 0, false, {
                            fileName: "[project]/pages/guide/[id].js",
                            lineNumber: 212,
                            columnNumber: 15
                        }, this),
                        quizHistory.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            style: {
                                marginTop: 20
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                                    style: {
                                        fontSize: '1em',
                                        marginBottom: 10,
                                        color: 'var(--text-secondary)'
                                    },
                                    children: "Past Attempts"
                                }, void 0, false, {
                                    fileName: "[project]/pages/guide/[id].js",
                                    lineNumber: 217,
                                    columnNumber: 19
                                }, this),
                                quizHistory.map((a, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "fc-hub-card",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: 'var(--text-primary)'
                                                },
                                                children: [
                                                    "Score: ",
                                                    a.score,
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/guide/[id].js",
                                                lineNumber: 220,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: 'var(--text-muted)',
                                                    fontSize: '0.8em'
                                                },
                                                children: [
                                                    a.correct_answers,
                                                    "/",
                                                    a.total_questions,
                                                    " correct | ",
                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$formatters$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["formatDate"])(a.completed_at)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/guide/[id].js",
                                                lineNumber: 221,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/pages/guide/[id].js",
                                        lineNumber: 219,
                                        columnNumber: 21
                                    }, this))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/guide/[id].js",
                            lineNumber: 216,
                            columnNumber: 17
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/guide/[id].js",
                    lineNumber: 208,
                    columnNumber: 13
                }, this)
            }, void 0, false, {
                fileName: "[project]/pages/guide/[id].js",
                lineNumber: 201,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/guide/[id].js",
        lineNumber: 84,
        columnNumber: 5
    }, this);
}
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__8f3d8ae3._.js.map