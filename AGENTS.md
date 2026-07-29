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
11. Resolve the tenant centrally; page components must consume typed tenant configuration instead of importing campus constants.
12. Every tenant-owned record and repository query must carry and filter by `university_id`.
13. Never accept a URL/profile tenant conflict. A slug changes navigation context, not authorization.
14. Platform administrators manage tenant metadata only; private student data requires an explicit elevated support workflow.
15. Compare stable feature concepts in the engine. Tenant labels and external keys are presentation/integration mappings.
16. Snapshot workflow definitions and versions when a case starts; later edits must not rewrite case history.
17. Keep demo state tenant-keyed and reset it during persona switching so stale cross-campus state cannot render.
18. Treat all university competition data as synthetic and avoid adoption or endorsement claims.
