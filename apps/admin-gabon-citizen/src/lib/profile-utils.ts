import type { Doc } from "@convex/_generated/dataModel";
import type { ProfileFormValues } from "@/lib/validation/profile";

/**
 * Compare deux valeurs et retourne true si elles sont différentes
 */
function isDifferent(a: any, b: any): boolean {
	// Gestion des valeurs null/undefined/chaînes vides
	const normalizeA = a === null || a === undefined || a === "" ? null : a;
	const normalizeB = b === null || b === undefined || b === "" ? null : b;

	if (normalizeA === null && normalizeB === null) {
		return false;
	}
	if (normalizeA === null || normalizeB === null) {
		return normalizeA !== normalizeB;
	}

	a = normalizeA;
	b = normalizeB;

	// Gestion des dates (comparer les timestamps)
	if (a instanceof Date && b instanceof Date) {
		return a.getTime() !== b.getTime();
	}
	if (typeof a === "number" && b instanceof Date) {
		return a !== b.getTime();
	}
	if (a instanceof Date && typeof b === "number") {
		return a.getTime() !== b;
	}

	// Gestion des tableaux
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return true;
		return a.some((item, index) => isDifferent(item, b[index]));
	}

	// Gestion des objets
	if (
		typeof a === "object" &&
		typeof b === "object" &&
		!Array.isArray(a) &&
		!Array.isArray(b)
	) {
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);

		if (keysA.length !== keysB.length) return true;

		return keysA.some((key) => isDifferent(a[key], b[key]));
	}

	// Comparaison simple
	return a !== b;
}

/**
 * Compare les valeurs du formulaire avec les valeurs originales du profil
 * et retourne uniquement les champs qui ont été modifiés
 */
export function getChangedFields(
	formData: ProfileFormValues,
	originalProfile: Doc<"profiles">,
): Partial<ProfileFormValues> {
	const changed: Partial<ProfileFormValues> = {};

	// Comparer countryOfResidence
	if (
		isDifferent(formData.countryOfResidence, originalProfile.countryOfResidence)
	) {
		changed.countryOfResidence = formData.countryOfResidence;
	}

	// Comparer identity
	if (formData.identity) {
		const originalIdentity = originalProfile.identity;
		const changedIdentity: Partial<ProfileFormValues["identity"]> = {};
		let hasChanges = false;

		if (isDifferent(formData.identity.firstName, originalIdentity?.firstName)) {
			changedIdentity.firstName = formData.identity.firstName;
			hasChanges = true;
		}
		if (isDifferent(formData.identity.lastName, originalIdentity?.lastName)) {
			changedIdentity.lastName = formData.identity.lastName;
			hasChanges = true;
		}
		if (
			isDifferent(
				formData.identity.birthDate?.getTime(),
				originalIdentity?.birthDate,
			)
		) {
			changedIdentity.birthDate = formData.identity.birthDate;
			hasChanges = true;
		}
		if (
			isDifferent(formData.identity.birthPlace, originalIdentity?.birthPlace)
		) {
			changedIdentity.birthPlace = formData.identity.birthPlace;
			hasChanges = true;
		}
		if (
			isDifferent(
				formData.identity.birthCountry,
				originalIdentity?.birthCountry,
			)
		) {
			changedIdentity.birthCountry = formData.identity.birthCountry;
			hasChanges = true;
		}
		if (isDifferent(formData.identity.gender, originalIdentity?.gender)) {
			changedIdentity.gender = formData.identity.gender;
			hasChanges = true;
		}
		if (
			isDifferent(formData.identity.nationality, originalIdentity?.nationality)
		) {
			changedIdentity.nationality = formData.identity.nationality;
			hasChanges = true;
		}
		if (
			isDifferent(
				formData.identity.nationalityAcquisition,
				originalIdentity?.nationalityAcquisition,
			)
		) {
			changedIdentity.nationalityAcquisition =
				formData.identity.nationalityAcquisition;
			hasChanges = true;
		}

		if (hasChanges) {
			changed.identity = {
				...formData.identity,
				...changedIdentity,
			} as ProfileFormValues["identity"];
		}
	}

	// Comparer passportInfo
	if (formData.passportInfo || originalProfile.passportInfo) {
		const originalPassport = originalProfile.passportInfo;
		const formPassport = formData.passportInfo;
		const changedPassport: Partial<ProfileFormValues["passportInfo"]> = {};
		let hasChanges = false;

		if (!originalPassport && formPassport) {
			// Nouveau passeport ajouté
			changed.passportInfo = formPassport;
		} else if (originalPassport && !formPassport) {
			// Passeport supprimé (ne devrait pas arriver normalement)
			changed.passportInfo = undefined;
		} else if (originalPassport && formPassport) {
			if (isDifferent(formPassport.number, originalPassport.number)) {
				changedPassport.number = formPassport.number;
				hasChanges = true;
			}
			if (
				isDifferent(
					formPassport.issueDate?.getTime(),
					originalPassport.issueDate,
				)
			) {
				changedPassport.issueDate = formPassport.issueDate;
				hasChanges = true;
			}
			if (
				isDifferent(
					formPassport.expiryDate?.getTime(),
					originalPassport.expiryDate,
				)
			) {
				changedPassport.expiryDate = formPassport.expiryDate;
				hasChanges = true;
			}
			if (
				isDifferent(
					formPassport.issuingAuthority,
					originalPassport.issuingAuthority,
				)
			) {
				changedPassport.issuingAuthority = formPassport.issuingAuthority;
				hasChanges = true;
			}

			if (hasChanges) {
				changed.passportInfo = {
					...formPassport,
					...changedPassport,
				} as ProfileFormValues["passportInfo"];
			}
		}
	}

	// Comparer addresses
	if (formData.addresses) {
		const originalAddresses = originalProfile.addresses;
		const changedAddresses: Partial<ProfileFormValues["addresses"]> = {};
		let hasChanges = false;

		// Comparer homeland
		if (formData.addresses.homeland) {
			const originalHomeland = originalAddresses?.homeland;
			const formHomeland = formData.addresses.homeland;

			// Si l'adresse n'existait pas avant mais existe maintenant, c'est un changement
			if (!originalHomeland) {
				// Vérifier qu'il y a au moins un champ rempli
				if (
					formHomeland.street ||
					formHomeland.city ||
					formHomeland.postalCode
				) {
					changedAddresses.homeland =
						formHomeland as ProfileFormValues["addresses"]["homeland"];
					hasChanges = true;
				}
			} else {
				const changedHomeland: Partial<
					ProfileFormValues["addresses"]["homeland"]
				> = {};
				let homelandChanged = false;

				if (isDifferent(formHomeland.street, originalHomeland.street)) {
					changedHomeland.street = formHomeland.street;
					homelandChanged = true;
				}
				if (isDifferent(formHomeland.city, originalHomeland.city)) {
					changedHomeland.city = formHomeland.city;
					homelandChanged = true;
				}
				if (isDifferent(formHomeland.postalCode, originalHomeland.postalCode)) {
					changedHomeland.postalCode = formHomeland.postalCode;
					homelandChanged = true;
				}
				if (isDifferent(formHomeland.country, originalHomeland.country)) {
					changedHomeland.country = formHomeland.country;
					homelandChanged = true;
				}

				if (homelandChanged) {
					changedAddresses.homeland = {
						...formHomeland,
						...changedHomeland,
					} as ProfileFormValues["addresses"]["homeland"];
					hasChanges = true;
				}
			}
		}

		// Comparer residence
		if (formData.addresses.residence) {
			const originalResidence = originalAddresses?.residence;
			const formResidence = formData.addresses.residence;

			// Si l'adresse n'existait pas avant mais existe maintenant, c'est un changement
			if (!originalResidence) {
				// Vérifier qu'il y a au moins un champ rempli
				if (
					formResidence.street ||
					formResidence.city ||
					formResidence.postalCode
				) {
					changedAddresses.residence =
						formResidence as ProfileFormValues["addresses"]["residence"];
					hasChanges = true;
				}
			} else {
				const changedResidence: Partial<
					ProfileFormValues["addresses"]["residence"]
				> = {};
				let residenceChanged = false;

				if (isDifferent(formResidence.street, originalResidence.street)) {
					changedResidence.street = formResidence.street;
					residenceChanged = true;
				}
				if (isDifferent(formResidence.city, originalResidence.city)) {
					changedResidence.city = formResidence.city;
					residenceChanged = true;
				}
				if (
					isDifferent(formResidence.postalCode, originalResidence.postalCode)
				) {
					changedResidence.postalCode = formResidence.postalCode;
					residenceChanged = true;
				}
				if (isDifferent(formResidence.country, originalResidence.country)) {
					changedResidence.country = formResidence.country;
					residenceChanged = true;
				}

				if (residenceChanged) {
					changedAddresses.residence = {
						...formResidence,
						...changedResidence,
					} as ProfileFormValues["addresses"]["residence"];
					hasChanges = true;
				}
			}
		}

		if (hasChanges) {
			changed.addresses = {
				...formData.addresses,
				...changedAddresses,
			} as ProfileFormValues["addresses"];
		}
	}

	// Comparer contacts
	if (formData.contacts) {
		const originalContacts = originalProfile.contacts;
		const changedContacts: Partial<ProfileFormValues["contacts"]> = {};
		let hasChanges = false;

		if (isDifferent(formData.contacts.email, originalContacts?.email)) {
			changedContacts.email = formData.contacts.email;
			hasChanges = true;
		}
		if (isDifferent(formData.contacts.phone, originalContacts?.phone)) {
			changedContacts.phone = formData.contacts.phone;
			hasChanges = true;
		}
		if (
			isDifferent(
				formData.contacts.emergencyContacts,
				(originalContacts as any)?.emergencyContacts,
			)
		) {
			changedContacts.emergencyContacts = formData.contacts.emergencyContacts;
			hasChanges = true;
		}

		if (hasChanges) {
			changed.contacts = {
				...formData.contacts,
				...changedContacts,
			} as ProfileFormValues["contacts"];
		}
	}

	// Comparer family
	if (formData.family) {
		const originalFamily = originalProfile.family;
		const changedFamily: Partial<ProfileFormValues["family"]> = {};
		let hasChanges = false;

		if (
			isDifferent(formData.family.maritalStatus, originalFamily?.maritalStatus)
		) {
			changedFamily.maritalStatus = formData.family.maritalStatus;
			hasChanges = true;
		}

		// Comparer father
		const originalFather = originalFamily?.father;
		const formFather = formData.family.father;
		if (formFather) {
			// Nouveau père ou modification
			if (!originalFather) {
				// Nouveau père ajouté
				if (formFather.firstName || formFather.lastName) {
					changedFamily.father = formFather;
					hasChanges = true;
				}
			} else {
				// Modifier père existant
				const changedFather: Partial<ProfileFormValues["family"]["father"]> =
					{};
				let fatherChanged = false;

				if (isDifferent(formFather.firstName, originalFather.firstName)) {
					changedFather.firstName = formFather.firstName;
					fatherChanged = true;
				}
				if (isDifferent(formFather.lastName, originalFather.lastName)) {
					changedFather.lastName = formFather.lastName;
					fatherChanged = true;
				}

				if (fatherChanged) {
					changedFamily.father = {
						...formFather,
						...changedFather,
					} as ProfileFormValues["family"]["father"];
					hasChanges = true;
				}
			}
		}

		// Comparer mother
		const originalMother = originalFamily?.mother;
		const formMother = formData.family.mother;
		if (formMother) {
			// Nouvelle mère ou modification
			if (!originalMother) {
				// Nouvelle mère ajoutée
				if (formMother.firstName || formMother.lastName) {
					changedFamily.mother = formMother;
					hasChanges = true;
				}
			} else {
				// Modifier mère existante
				const changedMother: Partial<ProfileFormValues["family"]["mother"]> =
					{};
				let motherChanged = false;

				if (isDifferent(formMother.firstName, originalMother.firstName)) {
					changedMother.firstName = formMother.firstName;
					motherChanged = true;
				}
				if (isDifferent(formMother.lastName, originalMother.lastName)) {
					changedMother.lastName = formMother.lastName;
					motherChanged = true;
				}

				if (motherChanged) {
					changedFamily.mother = {
						...formMother,
						...changedMother,
					} as ProfileFormValues["family"]["mother"];
					hasChanges = true;
				}
			}
		}

		// Comparer spouse
		const originalSpouse = originalFamily?.spouse;
		const formSpouse = formData.family.spouse;
		if (formSpouse) {
			// Nouveau conjoint ou modification
			if (!originalSpouse) {
				// Nouveau conjoint ajouté
				if (formSpouse.firstName || formSpouse.lastName) {
					changedFamily.spouse = formSpouse;
					hasChanges = true;
				}
			} else {
				// Modifier conjoint existant
				const changedSpouse: Partial<ProfileFormValues["family"]["spouse"]> =
					{};
				let spouseChanged = false;

				if (isDifferent(formSpouse.firstName, originalSpouse.firstName)) {
					changedSpouse.firstName = formSpouse.firstName;
					spouseChanged = true;
				}
				if (isDifferent(formSpouse.lastName, originalSpouse.lastName)) {
					changedSpouse.lastName = formSpouse.lastName;
					spouseChanged = true;
				}

				if (spouseChanged) {
					changedFamily.spouse = {
						...formSpouse,
						...changedSpouse,
					} as ProfileFormValues["family"]["spouse"];
					hasChanges = true;
				}
			}
		}

		if (hasChanges) {
			changed.family = {
				...formData.family,
				...changedFamily,
			} as ProfileFormValues["family"];
		}
	}

	// Note: Documents are now attached to requests, not profiles

	// Comparer profession
	if (formData.profession) {
		const originalProfession = originalProfile.profession;
		const changedProfession: Partial<ProfileFormValues["profession"]> = {};
		let hasChanges = false;

		if (!originalProfession && formData.profession) {
			// Nouvelle profession ajoutée
			if (
				formData.profession.status ||
				formData.profession.title ||
				formData.profession.employer
			) {
				changed.profession = formData.profession;
			}
		} else if (originalProfession) {
			if (isDifferent(formData.profession.status, originalProfession.status)) {
				changedProfession.status = formData.profession.status;
				hasChanges = true;
			}
			if (isDifferent(formData.profession.title, originalProfession.title)) {
				changedProfession.title = formData.profession.title;
				hasChanges = true;
			}
			if (
				isDifferent(formData.profession.employer, originalProfession.employer)
			) {
				changedProfession.employer = formData.profession.employer;
				hasChanges = true;
			}

			if (hasChanges) {
				changed.profession = {
					...formData.profession,
					...changedProfession,
				} as ProfileFormValues["profession"];
			}
		}
	}

	return changed;
}

/**
 * Transforme les valeurs du formulaire en format pour Convex (dates en timestamps)
 */
export function transformFormDataToPayload(
	formData: Partial<ProfileFormValues>,
): any {
	const payload: any = {};

	// countryOfResidence — sanitize empty string to undefined
	if (formData.countryOfResidence !== undefined) {
		payload.countryOfResidence = formData.countryOfResidence || undefined;
	}

	if (formData.identity) {
		payload.identity = {
			...formData.identity,
			birthCountry: formData.identity.birthCountry || undefined,
			nationality: formData.identity.nationality || undefined,
			gender: formData.identity.gender || undefined,
			nationalityAcquisition:
				formData.identity.nationalityAcquisition || undefined,
			birthDate:
				formData.identity.birthDate instanceof Date
					? formData.identity.birthDate.getTime()
					: formData.identity.birthDate,
		};
	}

	if (formData.passportInfo && formData.passportInfo.number) {
		payload.passportInfo = {
			number: formData.passportInfo.number,
			issuingAuthority: formData.passportInfo.issuingAuthority || "",
			issueDate:
				formData.passportInfo.issueDate instanceof Date
					? formData.passportInfo.issueDate.getTime()
					: (formData.passportInfo.issueDate ?? 0),
			expiryDate:
				formData.passportInfo.expiryDate instanceof Date
					? formData.passportInfo.expiryDate.getTime()
					: (formData.passportInfo.expiryDate ?? 0),
		};
	}

	if (formData.addresses) {
		payload.addresses = formData.addresses;
	}

	if (formData.contacts) {
		payload.contacts = {
			...formData.contacts,
			// Sanitize emergency contacts relationship enum
			emergencyContacts: formData.contacts.emergencyContacts?.map((c) => ({
				...c,
				relationship: c.relationship || undefined,
			})),
		};
	}

	if (formData.family) {
		payload.family = {
			...formData.family,
			// Sanitize maritalStatus enum — empty string → undefined
			maritalStatus: formData.family.maritalStatus || undefined,
		};
	}

	// Note: Documents are now attached to requests, not profiles

	if (formData.profession) {
		payload.profession = {
			...formData.profession,
			// Sanitize status enum — empty string → undefined
			status: formData.profession.status || undefined,
		};
	}

	return payload;
}
