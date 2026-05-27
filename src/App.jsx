import React, { useState, useCallback, useRef } from 'react';
import Terminal, { ColorMode, TerminalOutput } from 'react-terminal-ui';
import modules from './modules';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const BANNER = [
  "╔════════════════════════════════════════════════╗",
  "║            NOTES  TERMINAL                     ║",
  "║                                                ║",
  "║   Type 'help' for available commands            ║",
  "║   Type 'modules' to list modules                ║",
  "╚════════════════════════════════════════════════╝",
  "",
];

const HELP_HOME = [
  "",
  "  Commands:",
  "  ──────────────────────────────────────────────",
  "  modules              List available modules",
  "  use <module>         Enter a module",
  "  clear                Clear terminal",
  "  help                 Show this help message",
  "",
];

const HELP_MODULE = [
  "",
  "  Commands (inside module):",
  "  ──────────────────────────────────────────────",
  "  ls                   List all notes",
  "  ls <category>        Filter notes by category",
  "  categories           Show all categories",
  "  open <id|name>       Open a note in the viewer",
  "  info <id|name>       Show note details",
  "  search <term>        Search notes by keyword",
  "  back                 Return to module list",
  "  clear                Clear terminal",
  "  help                 Show this help message",
  "",
];

function findNote(notesList, query) {
  const q = query.trim().toLowerCase();
  const byId = notesList.find((n) => String(n.id) === q);
  if (byId) return byId;
  return notesList.find(
    (n) =>
      n.name.toLowerCase() === q ||
      n.name.toLowerCase().replace(/_/g, ' ') === q ||
      n.title.toLowerCase() === q
  );
}

function formatNoteRow(note) {
  const id = String(note.id).padStart(2, ' ');
  const cat = note.category.padEnd(22, ' ');
  return `  [${id}]  ${cat} ${note.title}`;
}

function formatModuleRow(mod, idx) {
  const num = String(idx + 1).padStart(2, ' ');
  const count = String(mod.notes.length).padStart(2, ' ');
  return `  [${num}]  ${mod.title.padEnd(20)} ${count} notes`;
}

export default function App() {
  const keyRef = useRef(0);
  const [lineData, setLineData] = useState(() =>
    BANNER.map((line) => {
      const k = keyRef.current++;
      return <TerminalOutput key={`k${k}`}>{line}</TerminalOutput>;
    })
  );
  const [activeNote, setActiveNote] = useState(null);
  const [activeModule, setActiveModule] = useState(null);

  const pushLines = useCallback((newLines) => {
    const elements = newLines.map((line) => {
      const k = keyRef.current++;
      return <TerminalOutput key={`k${k}`}>{line}</TerminalOutput>;
    });
    setLineData((prev) => [...prev, ...elements]);
  }, []);

  const promptLabel = activeModule ? `${activeModule.id}>` : '>';

  const handleInput = useCallback(
    (input) => {
      const trimmed = input.trim();
      const parts = trimmed.split(/\s+/);
      const cmd = parts[0]?.toLowerCase();
      const arg = parts.slice(1).join(' ');

      const prefix = activeModule ? `${activeModule.id}` : '~';
      pushLines([`${prefix} $ ${trimmed}`]);

      if (!cmd) return;

      if (cmd === 'clear') {
        setLineData([]);
        return;
      }

      if (!activeModule) {
        switch (cmd) {
          case 'help': {
            pushLines(HELP_HOME);
            break;
          }

          case 'modules': {
            pushLines([
              "",
              "  Available Modules:",
              "  ──────────────────────────────────────────────",
              ...modules.map(formatModuleRow),
              "",
              `  ${modules.length} module(s). Use 'use <name>' to enter.`,
              "",
            ]);
            break;
          }

          case 'use': {
            if (!arg) {
              pushLines(["  Usage: use <module name>", ""]);
              break;
            }
            const q = arg.toLowerCase();
            const mod = modules.find(
              (m) => m.id.toLowerCase() === q || m.title.toLowerCase() === q
            );
            if (!mod) {
              pushLines([`  Module "${arg}" not found. Type 'modules' to see available modules.`, ""]);
            } else {
              setActiveModule(mod);
              setActiveNote(null);
              pushLines([
                "",
                `  Entered module: ${mod.title}`,
                `  ${mod.description}`,
                `  ${mod.notes.length} note(s) available. Type 'ls' or 'help'.`,
                "",
              ]);
            }
            break;
          }

          default:
            pushLines([`  Unknown command: ${cmd}. Type 'help' for available commands.`, ""]);
        }
        return;
      }

      const notes = activeModule.notes;

      switch (cmd) {
        case 'help': {
          pushLines(HELP_MODULE);
          break;
        }

        case 'back': {
          const name = activeModule.title;
          setActiveModule(null);
          setActiveNote(null);
          pushLines([`  Left module: ${name}`, ""]);
          break;
        }

        case 'ls': {
          if (arg) {
            const filtered = notes.filter(
              (n) => n.category.toLowerCase().includes(arg.toLowerCase())
            );
            if (filtered.length === 0) {
              pushLines([`  No notes found in category "${arg}".`, ""]);
            } else {
              pushLines([
                "",
                `  Notes in "${arg}":`,
                "  ──────────────────────────────────────────────",
                ...filtered.map(formatNoteRow),
                "",
                `  ${filtered.length} note(s) found.`,
                "",
              ]);
            }
          } else {
            pushLines([
              "",
              `  ${activeModule.title} Notes:`,
              "  ──────────────────────────────────────────────",
              ...notes.map(formatNoteRow),
              "",
              `  ${notes.length} note(s). Use 'open <id>' to view.`,
              "",
            ]);
          }
          break;
        }

        case 'categories': {
          const cats = [...new Set(notes.map((n) => n.category))];
          pushLines([
            "",
            "  Categories:",
            "  ──────────────────────────────────────────────",
            ...cats.map((c) => {
              const count = notes.filter((n) => n.category === c).length;
              return `  • ${c} (${count})`;
            }),
            "",
          ]);
          break;
        }

        case 'open': {
          if (!arg) {
            pushLines(["  Usage: open <id|name>", ""]);
            break;
          }
          const note = findNote(notes, arg);
          if (!note) {
            pushLines([`  Note "${arg}" not found. Use 'ls' to see available notes.`, ""]);
          } else {
            setActiveNote({
              ...note,
              modulePath: activeModule.basePath,
              moduleTitle: activeModule.title,
            });
            pushLines([`  Opened: ${note.title}`, ""]);
          }
          break;
        }

        case 'info': {
          if (!arg) {
            pushLines(["  Usage: info <id|name>", ""]);
            break;
          }
          const note = findNote(notes, arg);
          if (!note) {
            pushLines([`  Note "${arg}" not found.`, ""]);
          } else {
            pushLines([
              "",
              `  Title:       ${note.title}`,
              `  ID:          ${note.id}`,
              `  Category:    ${note.category}`,
              `  Module:      ${activeModule.title}`,
              `  File:        ${note.name}.pdf`,
              `  Description: ${note.description}`,
              "",
            ]);
          }
          break;
        }

        case 'search': {
          if (!arg) {
            pushLines(["  Usage: search <keyword>", ""]);
            break;
          }
          const q = arg.toLowerCase();
          const results = notes.filter(
            (n) =>
              n.title.toLowerCase().includes(q) ||
              n.description.toLowerCase().includes(q) ||
              n.category.toLowerCase().includes(q) ||
              n.name.toLowerCase().includes(q)
          );
          if (results.length === 0) {
            pushLines([`  No results for "${arg}".`, ""]);
          } else {
            pushLines([
              "",
              `  Search results for "${arg}":`,
              "  ──────────────────────────────────────────────",
              ...results.map(formatNoteRow),
              "",
              `  ${results.length} result(s). Use 'open <id>' to view.`,
              "",
            ]);
          }
          break;
        }

        case 'modules': {
          pushLines(["  Use 'back' to return to module list first.", ""]);
          break;
        }

        default:
          pushLines([`  Unknown command: ${cmd}. Type 'help' for available commands.`, ""]);
      }
    },
    [pushLines, activeModule]
  );

  const pdfSrc = activeNote
    ? `${BASE}${activeNote.modulePath}/${activeNote.file}`
    : null;

  return (
    <div className="app-container">
      <div className="terminal-panel">
        <Terminal
          name="Notes Terminal"
          colorMode={ColorMode.Dark}
          onInput={handleInput}
          prompt={promptLabel}
          height="100%"
        >
          {lineData}
        </Terminal>
      </div>

      <div className="viewer-panel">
        {activeNote ? (
          <>
            <div className="viewer-header">
              <h2>{activeNote.title}</h2>
              <span className="badge">{activeNote.moduleTitle}</span>
              <span className="badge">{activeNote.category}</span>
            </div>
            <div className="viewer-content">
              <iframe src={pdfSrc} title={activeNote.title} />
            </div>
          </>
        ) : (
          <div className="viewer-content">
            <div className="viewer-placeholder">
              <div className="icon">&#128218;</div>
              <p>
                No note selected.<br />
                Type <code>modules</code> to list modules,
                then <code>use &lt;name&gt;</code> to enter one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
