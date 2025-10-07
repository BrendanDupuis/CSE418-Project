export function validatePassword(password: string): string | null {
	if (password.length < 8) {
		return "Password must contain at least 8 characters";
	}

	if (!/[A-Z]/.test(password)) {
		return "Password must contain an upper case character";
	}

	if (!/\d/.test(password)) {
		return "Password must contain a numeric character";
	}

	if (!/[^A-Za-z0-9]/.test(password)) {
		return "Password must contain a non-alphanumeric character";
	}

	return null;
}
