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
"[project]/components/ConfirmDialog.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ConfirmDialog
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
;
function ConfirmDialog({ title, message, onConfirm, onCancel }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "confirm-overlay",
        onClick: onCancel,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            className: "confirm-dialog",
            onClick: (e)=>e.stopPropagation(),
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                    children: title
                }, void 0, false, {
                    fileName: "[project]/components/ConfirmDialog.js",
                    lineNumber: 5,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                    children: message
                }, void 0, false, {
                    fileName: "[project]/components/ConfirmDialog.js",
                    lineNumber: 6,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "confirm-actions",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            className: "btn-outline",
                            onClick: onCancel,
                            children: "Cancel"
                        }, void 0, false, {
                            fileName: "[project]/components/ConfirmDialog.js",
                            lineNumber: 8,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            className: "btn btn-red",
                            onClick: onConfirm,
                            children: "Delete"
                        }, void 0, false, {
                            fileName: "[project]/components/ConfirmDialog.js",
                            lineNumber: 9,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/ConfirmDialog.js",
                    lineNumber: 7,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/ConfirmDialog.js",
            lineNumber: 4,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/ConfirmDialog.js",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
}),
"[project]/pages/folder/[id].js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>FolderPage
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$formatters$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/formatters.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ConfirmDialog$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ConfirmDialog.js [ssr] (ecmascript)");
;
;
;
;
;
;
;
function FolderPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const { id } = router.query;
    const { ready } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["useRequireAuth"])();
    const [folder, setFolder] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [folders, setFolders] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [guides, setGuides] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [confirm, setConfirm] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [contextMenu, setContextMenu] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [toast, setToast] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const contextRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (ready && id) loadData();
        function onClick(e) {
            if (contextRef.current && !contextRef.current.contains(e.target)) setContextMenu(null);
        }
        function onKey(e) {
            if (e.key === 'Escape') setContextMenu(null);
        }
        window.addEventListener('click', onClick);
        window.addEventListener('keydown', onKey);
        return ()=>{
            window.removeEventListener('click', onClick);
            window.removeEventListener('keydown', onKey);
        };
    }, [
        ready,
        id
    ]);
    function showToast(message, type = 'success') {
        setToast({
            message,
            type
        });
        setTimeout(()=>setToast(null), 2500);
    }
    async function loadData() {
        const [foldersData, guidesData] = await Promise.all([
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/folders'),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/guides?folder_id=' + id)
        ]);
        const allFolders = foldersData?.folders || [];
        setFolders(allFolders);
        const currentFolder = allFolders.find((f)=>f.id === id);
        setFolder(currentFolder || {
            name: 'Unknown Folder'
        });
        setGuides(guidesData?.guides || []);
    }
    function deleteGuide(guideId, e) {
        if (e) e.stopPropagation();
        setContextMenu(null);
        setConfirm({
            title: 'Delete Guide',
            message: 'Are you sure you want to delete this study guide?',
            onConfirm: async ()=>{
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/guides/' + guideId, {
                    method: 'DELETE'
                });
                setGuides(guides.filter((g)=>g.id !== guideId));
                setConfirm(null);
                showToast('Guide deleted', 'info');
            }
        });
    }
    function deleteFolder() {
        setConfirm({
            title: 'Delete Folder',
            message: 'Delete this folder and all its contents?',
            onConfirm: async ()=>{
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/folders/' + id, {
                    method: 'DELETE'
                });
                router.push('/dashboard');
            }
        });
    }
    function onGuideContextMenu(e, guide) {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            guide
        });
    }
    async function moveGuideToFolder(guideId, folderId) {
        setContextMenu(null);
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["apiFetch"])('/guides/' + guideId + '/move', {
            method: 'PATCH',
            body: JSON.stringify({
                folder_id: folderId
            })
        });
        if (data?.updated) {
            if (folderId !== id) {
                // Moved out of this folder
                setGuides(guides.filter((g)=>g.id !== guideId));
                const targetName = folderId ? folders.find((f)=>f.id === folderId)?.name : 'No class';
                showToast('Moved to ' + targetName);
            }
        }
    }
    if (!folder) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        style: {
            padding: 40,
            color: 'var(--text-muted)'
        },
        children: "Loading..."
    }, void 0, false, {
        fileName: "[project]/pages/folder/[id].js",
        lineNumber: 95,
        columnNumber: 23
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "fade-in",
        children: [
            confirm && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ConfirmDialog$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                title: confirm.title,
                message: confirm.message,
                onConfirm: confirm.onConfirm,
                onCancel: ()=>setConfirm(null)
            }, void 0, false, {
                fileName: "[project]/pages/folder/[id].js",
                lineNumber: 100,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("a", {
                href: "#",
                onClick: (e)=>{
                    e.preventDefault();
                    router.push('/dashboard?view=classes');
                },
                style: {
                    fontSize: '0.85em',
                    color: 'var(--text-muted)'
                },
                children: "← All Classes"
            }, void 0, false, {
                fileName: "[project]/pages/folder/[id].js",
                lineNumber: 108,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "section-header",
                style: {
                    marginTop: 12
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                        children: folder.name
                    }, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 113,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        className: "btn btn-red",
                        style: {
                            fontSize: '0.8em',
                            padding: '6px 14px'
                        },
                        onClick: deleteFolder,
                        children: "Delete Folder"
                    }, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 114,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/folder/[id].js",
                lineNumber: 112,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                style: {
                    color: 'var(--text-muted)',
                    marginBottom: 16
                },
                children: [
                    guides.length,
                    " study guides · Right-click a guide for options"
                ]
            }, void 0, true, {
                fileName: "[project]/pages/folder/[id].js",
                lineNumber: 119,
                columnNumber: 7
            }, this),
            guides.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "empty-state",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "empty-state-icon",
                        children: "📖"
                    }, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 123,
                        columnNumber: 11
                    }, this),
                    "No study guides in this folder yet.",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("br", {}, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 124,
                        columnNumber: 46
                    }, this),
                    "Use the Chrome extension to capture content and save it here."
                ]
            }, void 0, true, {
                fileName: "[project]/pages/folder/[id].js",
                lineNumber: 122,
                columnNumber: 9
            }, this) : guides.map((guide)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "card draggable-guide",
                    onClick: ()=>router.push('/guide/' + guide.id),
                    onContextMenu: (e)=>onGuideContextMenu(e, guide),
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "card-row",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                style: {
                                    flex: 1
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                                        children: guide.title
                                    }, void 0, false, {
                                        fileName: "[project]/pages/folder/[id].js",
                                        lineNumber: 136,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                        children: [
                                            guide.source_url && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                children: [
                                                    guide.source_url.substring(0, 50),
                                                    "..."
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/folder/[id].js",
                                                lineNumber: 138,
                                                columnNumber: 40
                                            }, this),
                                            ' ',
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                className: "timestamp",
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$formatters$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["formatDate"])(guide.created_at)
                                            }, void 0, false, {
                                                fileName: "[project]/pages/folder/[id].js",
                                                lineNumber: 140,
                                                columnNumber: 19
                                            }, this),
                                            guide.read_progress > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                style: {
                                                    marginLeft: 8
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                        className: "mini-progress",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                            className: "mini-progress-fill",
                                                            style: {
                                                                width: Math.round((guide.read_progress || 0) * 100) + '%'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/folder/[id].js",
                                                            lineNumber: 144,
                                                            columnNumber: 25
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/folder/[id].js",
                                                        lineNumber: 143,
                                                        columnNumber: 23
                                                    }, this),
                                                    Math.round((guide.read_progress || 0) * 100),
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/folder/[id].js",
                                                lineNumber: 142,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/folder/[id].js",
                                        lineNumber: 137,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/folder/[id].js",
                                lineNumber: 135,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                className: "btn btn-red",
                                style: {
                                    fontSize: '0.8em',
                                    padding: '4px 10px'
                                },
                                onClick: (e)=>deleteGuide(guide.id, e),
                                children: "Delete"
                            }, void 0, false, {
                                fileName: "[project]/pages/folder/[id].js",
                                lineNumber: 151,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 134,
                        columnNumber: 13
                    }, this)
                }, guide.id, false, {
                    fileName: "[project]/pages/folder/[id].js",
                    lineNumber: 128,
                    columnNumber: 11
                }, this)),
            contextMenu && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                ref: contextRef,
                className: "context-menu",
                style: {
                    top: contextMenu.y,
                    left: contextMenu.x
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "context-menu-header",
                        children: contextMenu.guide.title
                    }, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 166,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "context-menu-divider"
                    }, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 167,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "context-menu-item",
                        onClick: ()=>{
                            router.push('/guide/' + contextMenu.guide.id);
                            setContextMenu(null);
                        },
                        children: "📖 Open Guide"
                    }, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 168,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "context-menu-divider"
                    }, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 171,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "context-menu-label",
                        children: "Move to:"
                    }, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 172,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "context-menu-item",
                        onClick: ()=>moveGuideToFolder(contextMenu.guide.id, null),
                        children: "❌ Remove from class"
                    }, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 173,
                        columnNumber: 11
                    }, this),
                    folders.filter((f)=>f.id !== id).map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "context-menu-item",
                            onClick: ()=>moveGuideToFolder(contextMenu.guide.id, f.id),
                            children: [
                                "📁 ",
                                f.name
                            ]
                        }, f.id, true, {
                            fileName: "[project]/pages/folder/[id].js",
                            lineNumber: 177,
                            columnNumber: 13
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "context-menu-divider"
                    }, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 181,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "context-menu-item context-menu-danger",
                        onClick: ()=>deleteGuide(contextMenu.guide.id),
                        children: "🗑 Delete Guide"
                    }, void 0, false, {
                        fileName: "[project]/pages/folder/[id].js",
                        lineNumber: 182,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/folder/[id].js",
                lineNumber: 161,
                columnNumber: 9
            }, this),
            toast && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: 'toast toast-' + toast.type,
                children: toast.message
            }, void 0, false, {
                fileName: "[project]/pages/folder/[id].js",
                lineNumber: 188,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/folder/[id].js",
        lineNumber: 98,
        columnNumber: 5
    }, this);
}
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__9af2bc0a._.js.map