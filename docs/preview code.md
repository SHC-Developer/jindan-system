<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>TaskLog - Daily Entry</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script>
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        primary: "#135bec",
                        "primary-hover": "#0e4bce",
                        "background-light": "#f8f9fc",
                        "background-dark": "#101622",
                        "surface-light": "#ffffff",
                        "text-main": "#0d121b",
                        "text-secondary": "#4c669a",
                        "border-light": "#e7ebf3",
                        "border-medium": "#cfd7e7",
                    },
                    fontFamily: {
                        display: ["Manrope", "sans-serif"],
                    },
                    borderRadius: {
                        DEFAULT: "0.25rem",
                        lg: "0.5rem",
                        xl: "0.75rem",
                        "2xl": "1rem",
                    },
                },
            },
        }
    </script>
<style>
        /* Custom scrollbar for the table body */
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
        }
        /* Sticky header fix */
        thead th {
            position: sticky;
            top: 0;
            z-index: 10;
        }
    </style>
</head>
<body class="bg-background-light font-display text-text-main h-screen flex flex-col overflow-hidden">
<!-- Top Navigation -->
<header class="flex items-center justify-between whitespace-nowrap border-b border-border-light bg-surface-light px-8 py-3 shrink-0 z-20">
<div class="flex items-center gap-3 text-text-main">
<div class="size-8 flex items-center justify-center bg-primary/10 rounded-lg text-primary">
<span class="material-symbols-outlined">dataset</span>
</div>
<h2 class="text-text-main text-xl font-bold leading-tight tracking-tight">TaskLog</h2>
</div>
<div class="flex flex-1 justify-end gap-6 items-center">
<nav class="hidden md:flex items-center gap-8 mr-4">
<a class="text-primary text-sm font-semibold leading-normal border-b-2 border-primary pb-0.5" href="#">Dashboard</a>
<a class="text-text-secondary hover:text-text-main text-sm font-medium leading-normal transition-colors" href="#">Team Status</a>
<a class="text-text-secondary hover:text-text-main text-sm font-medium leading-normal transition-colors" href="#">Reports</a>
<a class="text-text-secondary hover:text-text-main text-sm font-medium leading-normal transition-colors" href="#">Settings</a>
</nav>
<div class="flex items-center gap-3 pl-6 border-l border-border-light">
<div class="text-right hidden sm:block">
<p class="text-xs font-bold text-text-main">강수민 (Kang Soomin)</p>
<p class="text-[10px] text-text-secondary">Senior Engineer</p>
</div>
<div class="bg-center bg-no-repeat bg-cover rounded-full size-9 ring-2 ring-white shadow-sm" data-alt="Portrait of a professional woman in office attire" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBny_yWEh2MG56AB4ANrzcubBOa3wPIXlufBI0tU9mDzDhgJCWZ5BmYHkRTwZ0BJwbyEHpSz9kusgr--KiF8IFLI9WaVcw1vlP0nPAdI1vHDAOhgihmzTBlORKQY9OF06mWIqtgfOgvpTp8nZ_sY3Ach3Qz0dGHWaA50HjTMMGCJZT02B5dn4LyjYRu-SFIH807_tawolty_-3pQ50rzEZsmvwDhc8NDtH-ut0U6VQIaHifM-hskJa9a9xnuJo1K71ovsMiWC3JcyTy");'></div>
</div>
</div>
</header>
<!-- Main Content Area -->
<main class="flex flex-1 overflow-hidden relative">
<div class="flex-1 flex flex-col h-full w-full max-w-7xl mx-auto">
<!-- Context Header -->
<div class="flex flex-col md:flex-row md:items-end justify-between gap-4 px-8 py-6 shrink-0">
<div class="flex flex-col gap-1">
<div class="flex items-center gap-2 text-text-secondary text-sm font-medium mb-1">
<span class="material-symbols-outlined text-[18px]">calendar_today</span>
<span>Week 42 (Oct 16 - Oct 20)</span>
</div>
<h1 class="text-text-main text-3xl font-extrabold leading-tight tracking-tight">Daily Tasks Entry</h1>
</div>
<div class="flex gap-3">
<button class="flex items-center gap-2 px-4 py-2 bg-white border border-border-medium rounded-lg text-text-main text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
<span class="material-symbols-outlined text-[18px]">history</span>
<span>View History</span>
</button>
<button class="flex items-center gap-2 px-4 py-2 bg-white border border-border-medium rounded-lg text-text-main text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
<span class="material-symbols-outlined text-[18px]">content_copy</span>
<span>Duplicate Previous</span>
</button>
</div>
</div>
<!-- Tabs -->
<div class="px-8 shrink-0">
<div class="flex border-b border-border-medium gap-8">
<a class="group flex flex-col items-center justify-center border-b-[3px] border-b-transparent hover:border-b-border-medium pb-3 pt-2 px-2 transition-all cursor-pointer">
<span class="text-text-secondary group-hover:text-text-main text-sm font-semibold tracking-wide">Mon (16)</span>
</a>
<a class="group flex flex-col items-center justify-center border-b-[3px] border-b-primary pb-3 pt-2 px-2 transition-all cursor-pointer">
<span class="text-primary text-sm font-bold tracking-wide">Tue (17)</span>
</a>
<a class="group flex flex-col items-center justify-center border-b-[3px] border-b-transparent hover:border-b-border-medium pb-3 pt-2 px-2 transition-all cursor-pointer">
<span class="text-text-secondary group-hover:text-text-main text-sm font-semibold tracking-wide">Wed (18)</span>
</a>
<a class="group flex flex-col items-center justify-center border-b-[3px] border-b-transparent hover:border-b-border-medium pb-3 pt-2 px-2 transition-all cursor-pointer">
<span class="text-text-secondary group-hover:text-text-main text-sm font-semibold tracking-wide">Thu (19)</span>
</a>
<a class="group flex flex-col items-center justify-center border-b-[3px] border-b-transparent hover:border-b-border-medium pb-3 pt-2 px-2 transition-all cursor-pointer">
<span class="text-text-secondary group-hover:text-text-main text-sm font-semibold tracking-wide">Fri (20)</span>
</a>
</div>
</div>
<!-- Table Container -->
<div class="flex-1 overflow-hidden px-8 py-6">
<div class="h-full flex flex-col bg-surface-light rounded-xl border border-border-medium shadow-sm overflow-hidden">
<!-- Scrollable Table Area -->
<div class="flex-1 overflow-y-auto custom-scrollbar">
<table class="w-full text-left border-collapse">
<thead class="bg-gray-50/80 backdrop-blur-sm border-b border-border-medium">
<tr>
<th class="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-16 text-center">#</th>
<th class="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-48">Category (구분)</th>
<th class="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Task Description (업무 내용)</th>
<th class="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-40 text-center">Priority (우선순위)</th>
<th class="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-24 text-center">Done (완료)</th>
<th class="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-16 text-center"></th>
</tr>
</thead>
<tbody class="divide-y divide-border-light">
<!-- Row 1 -->
<tr class="hover:bg-blue-50/30 transition-colors group">
<td class="px-6 py-4 text-center text-sm text-text-secondary font-medium">1</td>
<td class="px-6 py-4">
<div class="relative">
<select class="w-full appearance-none bg-white border border-border-medium text-text-main text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium shadow-sm">
<option selected="">Development</option>
<option>Meeting</option>
<option>Bug Fix</option>
<option>Planning</option>
<option>Support</option>
</select>
<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
<span class="material-symbols-outlined text-[20px]">expand_more</span>
</div>
</div>
</td>
<td class="px-6 py-4">
<textarea class="block w-full text-sm text-text-main bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 resize-none placeholder-gray-400 py-2" placeholder="Describe your task..." rows="2">Implement new authentication flow for mobile app using OAuth2.</textarea>
</td>
<td class="px-6 py-4 text-center">
<div class="inline-flex rounded-md shadow-sm" role="group">
<button class="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 focus:z-10 focus:ring-2 focus:ring-red-300" type="button">
                                                High
                                            </button>
</div>
</td>
<td class="px-6 py-4 text-center">
<input class="w-5 h-5 text-primary bg-white border-border-medium rounded focus:ring-primary focus:ring-2 cursor-pointer transition-all" type="checkbox"/>
</td>
<td class="px-6 py-4 text-center">
<button class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
<span class="material-symbols-outlined text-[20px]">delete</span>
</button>
</td>
</tr>
<!-- Row 2 -->
<tr class="hover:bg-blue-50/30 transition-colors group">
<td class="px-6 py-4 text-center text-sm text-text-secondary font-medium">2</td>
<td class="px-6 py-4">
<div class="relative">
<select class="w-full appearance-none bg-white border border-border-medium text-text-main text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium shadow-sm">
<option>Development</option>
<option selected="">Meeting</option>
<option>Bug Fix</option>
<option>Planning</option>
</select>
<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
<span class="material-symbols-outlined text-[20px]">expand_more</span>
</div>
</div>
</td>
<td class="px-6 py-4">
<textarea class="block w-full text-sm text-text-main bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 resize-none placeholder-gray-400 py-2" placeholder="Describe your task..." rows="2">Weekly sprint planning and backlog review with Product Team.</textarea>
</td>
<td class="px-6 py-4 text-center">
<div class="inline-flex rounded-md shadow-sm" role="group">
<button class="px-3 py-1.5 text-xs font-medium text-text-secondary bg-gray-100 border border-border-medium rounded-lg hover:bg-gray-200" type="button">
                                                Med
                                            </button>
</div>
</td>
<td class="px-6 py-4 text-center">
<input checked="" class="w-5 h-5 text-primary bg-white border-border-medium rounded focus:ring-primary focus:ring-2 cursor-pointer transition-all" type="checkbox"/>
</td>
<td class="px-6 py-4 text-center">
<button class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
<span class="material-symbols-outlined text-[20px]">delete</span>
</button>
</td>
</tr>
<!-- Row 3 -->
<tr class="hover:bg-blue-50/30 transition-colors group">
<td class="px-6 py-4 text-center text-sm text-text-secondary font-medium">3</td>
<td class="px-6 py-4">
<div class="relative">
<select class="w-full appearance-none bg-white border border-border-medium text-text-main text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium shadow-sm">
<option>Development</option>
<option>Meeting</option>
<option selected="">Bug Fix</option>
<option>Planning</option>
</select>
<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
<span class="material-symbols-outlined text-[20px]">expand_more</span>
</div>
</div>
</td>
<td class="px-6 py-4">
<textarea class="block w-full text-sm text-text-main bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 resize-none placeholder-gray-400 py-2" placeholder="Describe your task..." rows="2">Investigate production incident #402 (Login timeout on Safari).</textarea>
</td>
<td class="px-6 py-4 text-center">
<div class="inline-flex rounded-md shadow-sm" role="group">
<button class="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 focus:z-10 focus:ring-2 focus:ring-red-300" type="button">
                                                High
                                            </button>
</div>
</td>
<td class="px-6 py-4 text-center">
<input class="w-5 h-5 text-primary bg-white border-border-medium rounded focus:ring-primary focus:ring-2 cursor-pointer transition-all" type="checkbox"/>
</td>
<td class="px-6 py-4 text-center">
<button class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
<span class="material-symbols-outlined text-[20px]">delete</span>
</button>
</td>
</tr>
<!-- Row 4 -->
<tr class="hover:bg-blue-50/30 transition-colors group">
<td class="px-6 py-4 text-center text-sm text-text-secondary font-medium">4</td>
<td class="px-6 py-4">
<div class="relative">
<select class="w-full appearance-none bg-white border border-border-medium text-text-main text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium shadow-sm">
<option>Development</option>
<option>Meeting</option>
<option>Bug Fix</option>
<option selected="">Documentation</option>
</select>
<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
<span class="material-symbols-outlined text-[20px]">expand_more</span>
</div>
</div>
</td>
<td class="px-6 py-4">
<textarea class="block w-full text-sm text-text-main bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 resize-none placeholder-gray-400 py-2" placeholder="Describe your task..." rows="2">Update API documentation for new v2 endpoints.</textarea>
</td>
<td class="px-6 py-4 text-center">
<div class="inline-flex rounded-md shadow-sm" role="group">
<button class="px-3 py-1.5 text-xs font-medium text-text-secondary bg-gray-100 border border-border-medium rounded-lg hover:bg-gray-200" type="button">
                                                Low
                                            </button>
</div>
</td>
<td class="px-6 py-4 text-center">
<input class="w-5 h-5 text-primary bg-white border-border-medium rounded focus:ring-primary focus:ring-2 cursor-pointer transition-all" type="checkbox"/>
</td>
<td class="px-6 py-4 text-center">
<button class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
<span class="material-symbols-outlined text-[20px]">delete</span>
</button>
</td>
</tr>
<!-- Empty Rows for visual spacing/adding new tasks -->
<tr class="hover:bg-blue-50/30 transition-colors group">
<td class="px-6 py-4 text-center text-sm text-text-secondary font-medium">5</td>
<td class="px-6 py-4">
<div class="relative">
<select class="w-full appearance-none bg-white border border-border-medium text-text-secondary text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium shadow-sm">
<option disabled="" selected="">Select Category</option>
<option>Development</option>
<option>Meeting</option>
<option>Bug Fix</option>
<option>Support</option>
</select>
<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
<span class="material-symbols-outlined text-[20px]">expand_more</span>
</div>
</div>
</td>
<td class="px-6 py-4">
<textarea class="block w-full text-sm text-text-main bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 resize-none placeholder-gray-400 py-2" placeholder="Describe your task..." rows="2"></textarea>
</td>
<td class="px-6 py-4 text-center">
<div class="inline-flex rounded-md shadow-sm" role="group">
<button class="px-3 py-1.5 text-xs font-medium text-text-secondary bg-white border border-border-medium rounded-lg hover:bg-gray-50" type="button">
                                                Set
                                            </button>
</div>
</td>
<td class="px-6 py-4 text-center">
<input class="w-5 h-5 text-primary bg-white border-border-medium rounded focus:ring-primary focus:ring-2 cursor-pointer transition-all" type="checkbox"/>
</td>
<td class="px-6 py-4 text-center">
<button class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
<span class="material-symbols-outlined text-[20px]">delete</span>
</button>
</td>
</tr>
<tr class="hover:bg-blue-50/30 transition-colors group">
<td class="px-6 py-4 text-center text-sm text-text-secondary font-medium">6</td>
<td class="px-6 py-4">
<div class="relative">
<select class="w-full appearance-none bg-white border border-border-medium text-text-secondary text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium shadow-sm">
<option disabled="" selected="">Select Category</option>
<option>Development</option>
<option>Meeting</option>
<option>Bug Fix</option>
</select>
<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
<span class="material-symbols-outlined text-[20px]">expand_more</span>
</div>
</div>
</td>
<td class="px-6 py-4">
<textarea class="block w-full text-sm text-text-main bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 resize-none placeholder-gray-400 py-2" placeholder="Describe your task..." rows="2"></textarea>
</td>
<td class="px-6 py-4 text-center">
<div class="inline-flex rounded-md shadow-sm" role="group">
<button class="px-3 py-1.5 text-xs font-medium text-text-secondary bg-white border border-border-medium rounded-lg hover:bg-gray-50" type="button">
                                                Set
                                            </button>
</div>
</td>
<td class="px-6 py-4 text-center">
<input class="w-5 h-5 text-primary bg-white border-border-medium rounded focus:ring-primary focus:ring-2 cursor-pointer transition-all" type="checkbox"/>
</td>
<td class="px-6 py-4 text-center">
<button class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
<span class="material-symbols-outlined text-[20px]">delete</span>
</button>
</td>
</tr>
<tr class="hover:bg-blue-50/30 transition-colors group">
<td class="px-6 py-4 text-center text-sm text-text-secondary font-medium">7</td>
<td class="px-6 py-4">
<div class="relative">
<select class="w-full appearance-none bg-white border border-border-medium text-text-secondary text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium shadow-sm">
<option disabled="" selected="">Select Category</option>
<option>Development</option>
<option>Meeting</option>
<option>Bug Fix</option>
</select>
<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
<span class="material-symbols-outlined text-[20px]">expand_more</span>
</div>
</div>
</td>
<td class="px-6 py-4">
<textarea class="block w-full text-sm text-text-main bg-transparent border-0 border-b border-transparent focus:border-primary focus:ring-0 resize-none placeholder-gray-400 py-2" placeholder="Describe your task..." rows="2"></textarea>
</td>
<td class="px-6 py-4 text-center">
<div class="inline-flex rounded-md shadow-sm" role="group">
<button class="px-3 py-1.5 text-xs font-medium text-text-secondary bg-white border border-border-medium rounded-lg hover:bg-gray-50" type="button">
                                                Set
                                            </button>
</div>
</td>
<td class="px-6 py-4 text-center">
<input class="w-5 h-5 text-primary bg-white border-border-medium rounded focus:ring-primary focus:ring-2 cursor-pointer transition-all" type="checkbox"/>
</td>
<td class="px-6 py-4 text-center">
<button class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
<span class="material-symbols-outlined text-[20px]">delete</span>
</button>
</td>
</tr>
</tbody>
</table>
<!-- Add Row Button -->
<div class="p-4 border-t border-border-light bg-gray-50/50">
<button class="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors w-full justify-center border border-dashed border-primary/30">
<span class="material-symbols-outlined text-[20px]">add</span>
                                Add New Task
                            </button>
</div>
</div>
</div>
</div>
<!-- Footer Action Bar -->
<footer class="px-8 py-5 border-t border-border-light bg-surface-light shrink-0">
<div class="flex items-center justify-between">
<button class="flex items-center gap-2 px-4 py-2.5 text-text-secondary hover:text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors">
<span class="material-symbols-outlined text-[20px]">restart_alt</span>
                        Reset Today (오늘 업무 초기화)
                    </button>
<div class="flex items-center gap-4">
<div class="text-sm text-text-secondary mr-2">
                            Last saved: <span class="font-medium text-text-main">Today at 10:42 AM</span>
</div>
<button class="flex items-center justify-center gap-2 px-8 py-3 bg-primary hover:bg-primary-hover text-white text-base font-bold rounded-lg shadow-lg shadow-primary/30 transition-all active:scale-95">
<span class="material-symbols-outlined">save</span>
                            Save Changes (저장)
                        </button>
</div>
</div>
</footer>
</div>
</main>
</body></html>