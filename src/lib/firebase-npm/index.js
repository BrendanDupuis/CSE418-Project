var i = Object.defineProperty;
var n = ($, _) => {
	for (var M in _) i($, M, { get: _[M], enumerable: !0, configurable: !0, set: (W) => (_[M] = () => W) });
};
var a = ($, _) => () => ($ && (_ = $(($ = 0))), _);
var k = {};
n(k, {
	verify: () => {
		return g;
	},
	sign: () => {
		return b;
	},
	default: () => {
		return X$;
	},
	decode: () => {
		return J;
	},
});
async function $$($, _, M) {
	return await crypto.subtle.importKey("raw", F($), _, !0, M);
}
async function M$($, _, M) {
	return await crypto.subtle.importKey("jwk", $, _, !0, M);
}
async function _$($, _, M) {
	return await crypto.subtle.importKey("spki", f($), _, !0, M);
}
async function W$($, _, M) {
	const k = await crypto.subtle.importKey("pkcs8", Buffer.from(f($)), _, !0, M);
	return k;
}
async function v($, _, M) {
	if (typeof $ === "object") return M$($, _, M);
	if (typeof $ !== "string") throw new Error("Unsupported key type!");
	if ($.includes("PUBLIC")) return _$($, _, M);
	if ($.includes("PRIVATE")) return W$($, _, M);
	return $$($, _, M);
}
async function b($, _, M = "HS256") {
	if (typeof M === "string") M = { algorithm: M };
	if (((M = { algorithm: "HS256", header: { typ: "JWT" }, ...M }), !$ || typeof $ !== "object")) throw new Error("payload must be an object");
	if (!_ || (typeof _ !== "string" && typeof _ !== "object")) throw new Error("secret must be a string, a JWK object or a CryptoKey object");
	if (typeof M.algorithm !== "string") throw new Error("options.algorithm must be a string");
	const W = m[M.algorithm];
	if (!W) throw new Error("algorithm not found");
	if (!$.iat) $.iat = Math.floor(Date.now() / 1000);
	const X = `${T(JSON.stringify({ ...M.header, alg: M.algorithm }))}.${T(JSON.stringify($))}`,
		Z = _ instanceof CryptoKey ? _ : await v(_, W, ["sign"]),
		Y = await crypto.subtle.sign(W, Z, F(X));
	return `${X}.${o(Y)}`;
}
async function g($, _, M = "HS256") {
	if (typeof M === "string") M = { algorithm: M };
	if (((M = { algorithm: "HS256", clockTolerance: 0, throwError: !1, ...M }), typeof $ !== "string")) throw new Error("token must be a string");
	if (typeof _ !== "string" && typeof _ !== "object") throw new Error("secret must be a string, a JWK object or a CryptoKey object");
	if (typeof M.algorithm !== "string") throw new Error("options.algorithm must be a string");
	const W = $.split(".");
	if (W.length !== 3) throw new Error("token must consist of 3 parts");
	const X = m[M.algorithm];
	if (!X) throw new Error("algorithm not found");
	const { header: Z, payload: Y } = J($);
	if (Z?.alg !== M.algorithm) {
		if (M.throwError) throw new Error("ALG_MISMATCH");
		return !1;
	}
	try {
		if (!Y) throw new Error("PARSE_ERROR");
		const K = Math.floor(Date.now() / 1000);
		if (Y.nbf && Y.nbf > K && Y.nbf - K > (M.clockTolerance ?? 0)) throw new Error("NOT_YET_VALID");
		if (Y.exp && Y.exp <= K && K - Y.exp > (M.clockTolerance ?? 0)) throw new Error("EXPIRED");
		const L = _ instanceof CryptoKey ? _ : await v(_, X, ["verify"]);
		return await crypto.subtle.verify(X, L, e(W[2]), F(`${W[0]}.${W[1]}`));
	} catch (K) {
		if (M.throwError) throw K;
		return !1;
	}
}
var s, R, t, D, F, o, e, T, f, O, J, m, X$;
var P = a(() => {
	(s = ($) => {
		let _ = "";
		for (let M = 0; M < $.byteLength; M++) _ += String.fromCharCode($[M]);
		return _;
	}),
		(R = ($) => {
			const _ = new Uint8Array($.length);
			for (let M = 0; M < $.length; M++) _[M] = $.charCodeAt(M);
			return _;
		}),
		(t = ($) => btoa(s(new Uint8Array($)))),
		(D = ($) => R(atob($)).buffer),
		(F = ($) => R($)),
		(o = ($) => t($).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")),
		(e = ($) => D($.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, ""))),
		(T = ($) => {
			const M = new TextEncoder().encode($),
				W = String.fromCharCode(...M);
			return btoa(W).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
		}),
		(f = ($) => D($.replace(/-+(BEGIN|END).*/g, "").replace(/\s/g, "")));
	O = ($) => {
		try {
			const _ = Array.from(atob($), (W) => W.charCodeAt(0)),
				M = new TextDecoder("utf-8").decode(new Uint8Array(_));
			return JSON.parse(M);
		} catch {
			return;
		}
	};
	J = ($) => ({ header: O($.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")), payload: O($.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")) });
	if (typeof crypto === "undefined" || !crypto.subtle) throw new Error("SubtleCrypto not supported!");
	(m = {
		ES256: { name: "ECDSA", namedCurve: "P-256", hash: { name: "SHA-256" } },
		ES384: { name: "ECDSA", namedCurve: "P-384", hash: { name: "SHA-384" } },
		ES512: { name: "ECDSA", namedCurve: "P-521", hash: { name: "SHA-512" } },
		HS256: { name: "HMAC", hash: { name: "SHA-256" } },
		HS384: { name: "HMAC", hash: { name: "SHA-384" } },
		HS512: { name: "HMAC", hash: { name: "SHA-512" } },
		RS256: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
		RS384: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-384" } },
		RS512: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-512" } },
	}),
		(X$ = { sign: b, verify: g, decode: J });
});
function H($) {
	switch (typeof $) {
		case "string":
			return { stringValue: $ };
		case "number":
			if (Number.isInteger($)) return { integerValue: $ };
			return { doubleValue: $ };
		case "boolean":
			return { booleanValue: $ };
		case "object":
			if (Array.isArray($)) return { arrayValue: { values: $.map((_) => H(_)) } };
			return { mapValue: { fields: Object.keys($).reduce((_, M) => ({ ..._, [M]: H($[M]) }), {}) } };
		case null:
			return { nullValue: null };
		default:
			return $;
	}
}
function A($) {
	const _ = {};
	for (const M in $)
		if (Object.hasOwn($, M)) {
			const W = $[M];
			_[M] = H(W);
		}
	return _;
}
function x($) {
	const _ = {};
	for (const M in $)
		if (Object.hasOwn($, M)) {
			const W = $[M];
			if (W.arrayValue)
				_[M] = W.arrayValue?.values?.map((X) => {
					if (X.mapValue) return x(X.mapValue.fields);
					else return U(X);
				});
			else if (W.mapValue) _[M] = x(W?.mapValue?.fields || {});
			else _[M] = U(W);
		}
	return _;
}
function U($) {
	for (const _ in $)
		if (Object.hasOwn($, _)) {
			const M = $[_];
			switch (_) {
				case "stringValue":
					return M;
				case "integerValue":
					return Number(M);
				case "booleanValue":
					return M;
				case "nullValue":
					return null;
				default:
					return M;
			}
		}
}
function I($) {
	const _ = $?.name ? $?.name?.split("/").pop() : void 0,
		M = $?.fields;
	try {
		return { id: _, ...x(M) };
	} catch (W) {
		return console.log("error in formatValuesWithType: ", W), {};
	}
}
function G($) {
	const _ = process.env;
	return {
		Authorization: "Bearer " + _.FIREBASE_REST_ACCESS_TOKEN,
		"x-goog-request-params": `project_id=${_.FIREBASE_REST_PROJECT_ID}&database_id=${_.FIREBASE_REST_DATABASE_ID || $ || "(default)"}`,
	};
}
function C($) {
	if ($.length >= 2 && $.startsWith("/") && $.endsWith("/")) return $.substring(1, $.length - 1);
	return $;
}
function B($) {
	switch ($) {
		case "==":
			return "EQUAL";
		case ">":
			return "GREATER_THAN";
		case ">=":
			return "GREATER_THAN_OR_EQUAL";
		case "<":
			return "LESS_THAN";
		case "<=":
			return "LESS_THAN_OR_EQUAL";
		case "array-contains":
			return "ARRAY_CONTAINS";
		case "in":
			return "IN";
		case "array-contains-any":
			return "ARRAY_CONTAINS_ANY";
		case "!=":
			return "NOT_EQUAL";
		case "not-in":
			return "NOT_IN";
		default:
			throw new Error(`Invalid WhereFilterOp: ${$}`);
	}
}
function j($) {
	switch ($) {
		case "asc":
			return "ASCENDING";
		case "desc":
			return "DESCENDING";
		default:
			throw new Error(`Invalid OrderByDirection: ${$}`);
	}
}
async function S() {
	try {
		const $ = { ...process.env },
			_ = await fetch(`https://firestore.googleapis.com/v1beta1/projects/${$.FIREBASE_REST_PROJECT_ID}/databases/${$.FIREBASE_REST_DATABASE_ID}/documents/test/test`, {
				method: "GET",
				headers: G(),
			});
		if (_.status === 401 || _.status === 403) return console.error("Invalid service account credentials"), !1;
		else return !0;
	} catch ($) {
		return console.error("Error has occured init fireabse.."), !1;
	}
}
async function Y$($) {
	const { sign: _ } = await Promise.resolve().then(() => (P(), k)),
		M = $?.serviceAccount || JSON.parse(process.env.GCLOUD_SERVICE_ACCOUNT || "{}");
	if (!M) throw new Error("SERVICE_ACCOUNT not found in environment variables");
	const W = M.private_key;
	return await _(
		{
			iss: M.client_email,
			sub: M.client_email,
			aud: `https://${$?.service || "firestore"}.googleapis.com/`,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 3600,
		},
		W,
		{ algorithm: "RS256", header: { kid: M.private_key_id || ".", typ: "JWT", alg: "RS256" } },
	);
}
async function h($) {
	if (
		(($ = {
			serviceAccount: {
				client_email: process.env.FAR_CLIENT_EMAIL || $?.serviceAccount?.client_email || "",
				project_id: process.env.FAR_PROJECT_ID || $?.serviceAccount?.project_id || "",
				private_key: process.env.FAR_PRIVATE_KEY || $?.serviceAccount?.private_key || "",
			},
		}),
		!$.serviceAccount?.project_id)
	)
		throw new Error("project_id, client_email, private_key are required in serviceAccount.");
	if (!$.serviceAccount?.client_email) throw new Error("project_id, client_email, private_key are required in serviceAccount.");
	if (!$.serviceAccount?.private_key) throw new Error("project_id, client_email, private_key are required in serviceAccount.");
	const _ = await Y$({ serviceAccount: $.serviceAccount });
	if (
		((process.env.FIREBASE_REST_ACCESS_TOKEN = _),
		(process.env.FIREBASE_REST_PROJECT_ID = $.serviceAccount.project_id),
		(process.env.FIREBASE_REST_DATABASE_ID = $.databaseId || "(default)"),
		!(await S()))
	)
		throw new Error("Service account auth failed, please check the service account credentials.");
	return { databaseId: $.databaseId || "(default)", serviceAccount: $.serviceAccount, accessToken: _ };
}
async function u($, _) {
	const M = process.env,
		W = _?.db || M.FIREBASE_REST_DATABASE_ID;
	try {
		const X = await fetch(`https://firestore.googleapis.com/v1beta1/projects/${M.FIREBASE_REST_PROJECT_ID}/databases/${W}/documents/${$}`, { method: "GET", headers: G(W) }).then(
			(Z) => Z.json(),
		);
		if (X.error) {
			// Handle "not found" errors gracefully - return a document that doesn't exist
			if (X.error.code === 404 || X.error.message?.includes("not found")) {
				return {
					id: $.includes("/") ? $.split("/").pop() || $ : $,
					ref: $,
					exists: () => false,
					data: () => undefined,
					jsonResponse: X,
				};
			}
			throw new Error(X.error.message);
		}
		if (X?.fields) return { id: $.includes("/") ? $.split("/").pop() || $ : $, ref: $, exists: () => !0, data: () => I(X), jsonResponse: X };
		else
			return {
				id: $.includes("/") ? $.split("/").pop() || $ : $,
				ref: $,
				exists: () => !1,
				data: () => {
					return;
				},
				jsonResponse: X,
			};
	} catch (X) {
		// Handle network errors or other issues
		if (X.message?.includes("not found") || X.message?.includes("404")) {
			return {
				id: $.includes("/") ? $.split("/").pop() || $ : $,
				ref: $,
				exists: () => false,
				data: () => undefined,
				jsonResponse: null,
			};
		}
		throw (console.error(X), new Error("Error fetching document from Firestore: "));
	}
}
async function w($, _) {
	const M = process.env,
		W = _?.page ? (_.page - 1) * (_.limit || 20) : 0;
	const X = $.includes("/") ? $.split("/") : [],
		Z = X.length ? X.pop() : $;
	const Y = X?.length ? X.join("/") : "",
		K = Y ? `${Y}/${Z}` : Z;
	const L = { structuredQuery: { from: [{ collectionId: Z }], limit: _?.limit || 100 } };
	for (const Q of _?.where || [])
		L.structuredQuery.where = {
			compositeFilter: {
				op: "AND",
				filters: [...(L?.structuredQuery?.where?.compositeFilter?.filters || []), { fieldFilter: { field: { fieldPath: Q.field }, op: Q.op, value: H(Q.value) } }],
			},
		};
	if (_?.orderBy && _?.orderBy.field) L.structuredQuery.orderBy = [{ field: { fieldPath: _.orderBy.field }, direction: _.orderBy.direction }];
	if (W) L.structuredQuery.offset = W;
	const z = await fetch(
		`https://firestore.googleapis.com/v1beta1/projects/${M.FIREBASE_REST_PROJECT_ID}/databases/${M.FIREBASE_REST_DATABASE_ID}/documents${Y ? `/${Y}` : ""}:runQuery`,
		{ method: "POST", headers: G(), body: JSON.stringify(L) },
	)
		.then((Q) => Q.json())
		.catch((Q) => {
			throw new Error("Error fetching in querying documents from Firestore: ", Q);
		});
	if (z.error || z[0]?.error) throw (console.error(JSON.stringify(z[0].error)), new Error("Error in querying documents from Firestore:"));
	if (z.length > 0) {
		const Q = z
			.map((N) => {
				return I(N?.document);
			})
			.filter((N) => N.id);
		return { size: Q.length, empty: Q.length === 0, docs: Q.map((N) => ({ id: N.id, ref: K, exists: () => !0, data: () => N })), jsonResponse: z };
	} else return { size: 0, empty: !0, docs: [], jsonResponse: z };
}
async function q($, _, M) {
	const W = process.env,
		X = M?.db || W.FIREBASE_REST_DATABASE_ID;
	$ = C($);
	const Z = $?.includes("/") ? $.split("/").pop() || $ : $,
		Y = A(_),
		K = M?.merge
			? `?${Object.keys(_)
					.map((z, Q) => (Q !== 0 ? "&" : "") + `updateMask.fieldPaths=${z}`)
					.join("")}`
			: "",
		L = await fetch(`https://firestore.googleapis.com/v1beta1/projects/${W.FIREBASE_REST_PROJECT_ID}/databases/${X}/documents/${$}${K}`, {
			method: "PATCH",
			headers: G(X),
			body: JSON.stringify({ fields: Y }),
		});
	if (L.status !== 200) throw new Error(`Non 200 status req, error setting/updating document ${$} in Firestore `, L);
	return { id: Z, exists: () => !0, ref: $, data: () => _, response: L };
}
async function E($, _) {
	const M = process.env,
		W = _?.db || M.FIREBASE_REST_DATABASE_ID;
	try {
		return {
			response: await fetch(`https://firestore.googleapis.com/v1beta1/projects/${M.FIREBASE_REST_PROJECT_ID}/databases/${W}/documents/${$}`, { method: "DELETE", headers: G(W) }),
		};
	} catch (X) {
		return { error: X };
	}
}
var Z$ = ($, _ = 950000) => {
	const M = [];
	for (let W = 0; W < $.length; W += _) M.push($.slice(W, W + _));
	return M;
};
async function y($, _) {
	try {
		const M = await w($, { orderBy: { field: "index", direction: "ASCENDING" }, db: _?.db }).then((Y) => {
				const K = Y.docs.sort((L, z) => {
					const Q = Number(L.id.split("_").pop()),
						N = Number(z.id.split("_").pop());
					return Q - N;
				});
				return { ...Y, docs: K };
			}),
			W = M.docs.map((Y) => Y?.data()?.JSON_STRING || "").join(""),
			X = JSON.parse(W || "[]");
		if (!Array.isArray(X))
			throw new Error(`JSON payload in collection ${$} is corrupt, a collection using the DJ engine can't be used to store anything else but its own document data.`);
		const Z = JSON.parse(W || "[]").map((Y, K) => {
			return { id: `JSON_STRING_${K}`, data: () => Y, exists: !0 };
		});
		return { size: Z?.length || 0, empty: Z?.length ? !1 : !0, docReads: M?.size || 0, docs: Z, jsonResponse: M.jsonResponse };
	} catch (M) {
		return console.error("!! error in docs to json", M), { size: 0, empty: !0, docs: [], error: M, docReads: 0 };
	}
}
async function d($, _, M) {
	try {
		const X = JSON.stringify(_),
			Z = Z$(X, 950000),
			Y = Z.map((K, L) => {
				return q(`${$}/JSON_STRING_${L}`, { JSON_STRING: K, lastDoc: Z?.length || 0, index: L }, { db: M?.db, merge: !0 });
			});
		return await Promise.allSettled(Y), { success: !0, message: `Successfully written ${_.length} docs in ${$}` };
	} catch (W) {
		return console.error("error in json to docs", W), { success: !1, error: W };
	}
}
async function l($, _) {
	try {
		const M = await w($, { db: _?.db, limit: 100 });
		if (M.empty) return { success: !1, message: `No docs to delete in ${$}`, jsonResponse: M.jsonResponse };
		const W = [];
		for (let X = 0; X < M.docs?.length; X++) {
			const Z = M.docs[X].id;
			W.push(E(`${$}/${Z}`, { db: _?.db }));
		}
		return await Promise.allSettled(W), { success: !0, message: `Successfully deleted ${M.docs?.length} docs in ${$}`, jsonResponse: M.jsonResponse };
	} catch (M) {
		throw (console.error("error in collection delete", M), new Error(`Error deleting docs in ${$}`));
	}
}
class p {
	$;
	constructor($) {
		this.databaseId = $;
		return this;
	}
	doc($) {
		return new c(C($), this.databaseId);
	}
	collection($) {
		return new r(C($), this.databaseId);
	}
}
class c {
	$;
	_;
	constructor($, _) {
		this.docPath = $;
		this.databaseId = _;
	}
	async update($) {
		return await q(this.docPath, $, { merge: !0, db: this.databaseId });
	}
	async set($, _) {
		return await q(this.docPath, $, { ..._, db: this.databaseId });
	}
	async get() {
		return await u(this.docPath, { db: this.databaseId, debug: !1 });
	}
	async delete() {
		return await E(this.docPath, { db: this.databaseId });
	}
}
class r {
	$;
	_;
	whereQueries;
	orderByQuery;
	limitQuery;
	pageQuery;
	constructor($, _) {
		this.collectionPath = $;
		this.databaseId = _;
		(this.whereQueries = []), (this.orderByQuery = { field: "", direction: "ASCENDING" }), (this.limitQuery = 100), (this.pageQuery = 1);
	}
	where($, _, M) {
		return this.whereQueries.push({ field: $, op: B(_), value: M }), this;
	}
	orderBy($, _) {
		return (this.orderByQuery = { field: $, direction: j(_) }), this;
	}
	limit($) {
		return (this.limitQuery = $), this;
	}
	async delete() {
		return await l(this.collectionPath, { db: this.databaseId });
	}
	page($) {
		return (this.pageQuery = $), this;
	}
	async tojson() {
		return await y(this.collectionPath, { db: this.databaseId });
	}
	async todocs($) {
		return await d(this.collectionPath, $, { db: this.databaseId });
	}
	async get() {
		let $;
		return ($ = await w(this.collectionPath, { where: this.whereQueries, orderBy: this.orderByQuery, limit: this.limitQuery, db: this.databaseId, page: this.pageQuery })), $;
	}
}
class V {
	initialValue;
	constructor($) {
		return (this.initialValue = $), this;
	}
	async firestore() {
		const $ = await h(this.initialValue);
		return new p($.databaseId);
	}
}
function K$($) {
	return new V($);
}
export { K$ as initFirebaseRest };
