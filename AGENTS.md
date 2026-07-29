# RoomReady engineering rules

1. Keep compatibility and ranking deterministic, pure, explainable, and independent of UI frameworks.
2. Never use an LLM to decide compatibility or room eligibility. AI may only revise wording after facts are fixed, with a template fallback.
3. Store functional requirements only. Do not add diagnosis fields, medical labels, or instructor access to a student’s full profile.
4. Treat required features as hard gates. Unknown data requires verification; temporary outages fail the check; preferences never fail it.
5. Final room reassignment always requires an authorised staff action.
6. Keep the primary Room 202 → 815 → 812 scenario deterministic and resettable.
7. Preserve semantic HTML, keyboard support, focus visibility, reduced motion, descriptive labels, and status text independent of colour.
8. Add tests for every compatibility rule and privacy-sensitive notification change.
9. Keep local demo mode fully functional without external credentials.
10. Run `npm run quality` and the Playwright competition flow before handoff.
