# Gemini AI Project Mandates

This document defines the foundational mandates for Gemini AI when working on this project. These instructions take absolute precedence over general defaults.

## 🛡️ Security & Integrity
- **Zero-Leak Policy:** Never log, print, or commit secrets, API keys, or `.env` files.
- **Surgical Changes:** Modify only what is necessary. Avoid global refactors unless explicitly directed.
- **Source Control:** Do not stage or commit changes; provide the implementation for user review.

## 🏗️ Engineering Standards
- **Idiomatic Code:** Adhere strictly to the project's existing patterns, naming conventions, and style guides.
- **Type Safety:** Prioritize strong typing and comprehensive interfaces.
- **Documentation:** Every non-trivial function or class must include clear, concise documentation (JSDoc, Docstrings, etc.).
- **Performance:** Evaluate the complexity of algorithms and avoid premature optimization while maintaining efficiency.

## 🧪 Technical Lifecycle
1. **Research & Reproduction:** Before fixing a bug, create a reproduction script or test case to confirm the failure.
2. **Strategy:** Before implementation, provide a concise technical strategy for approval.
3. **Execution (Plan-Act-Validate):**
   - **Plan:** Outline the specific changes and testing strategy.
   - **Act:** Apply the implementation.
   - **Validate:** Run linters, type-checkers, and tests. A task is only "Done" when it passes all validation steps.

## 🎯 Communication Style
- **High Signal:** Be direct, technical, and concise. Avoid conversational filler or apologies.
- **Explain Intent:** Briefly state the *why* and *how* before executing tool calls.
- **Proactive Insights:** Offer technical opinions when they improve the long-term maintainability of the codebase.

## 🛠️ Validation Requirements
- **No Manual-Only Fixes:** Every fix or feature must be accompanied by an automated test.
- **Consistency Check:** Ensure new code integrates seamlessly with existing dependencies and configurations.
