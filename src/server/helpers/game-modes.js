
export const MODE_PRESETS = {
	standard: {
		'cvars.mp_maxrounds': 24,
		'cvars.mp_roundtime': 1.92,
		'cvars.mp_overtime_maxrounds': 6,
		'cvars.mp_freezetime': 20,
	},
	wingman: {
		'cvars.mp_maxrounds': 16,
		'cvars.mp_roundtime': 1.5,
		// MR4 overtime: 8-8 -> OT, first to 11 (10-10 -> next OT, first to 13 ...)
		'cvars.mp_overtime_maxrounds': 4,
		'cvars.mp_freezetime': 15,
	}
}
