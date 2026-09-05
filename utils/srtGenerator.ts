export interface PunctuationWeight {
	comma?: number;
	ellipsis?: number;
	period?: number;
	exclamation?: number;
	question?: number;
}

export interface GenerateSrtOptions {
	maxChars?: number;
	maxWords?: number;

	punctuationWeight?: PunctuationWeight;

	minDuration?: number;
	maxDuration?: number;
}

const DEFAULT_PUNCTUATION_WEIGHT: Required<PunctuationWeight> = {
	comma: 0.2,
	ellipsis: 0.5,
	period: 0.3,
	exclamation: 0.4,
	question: 0.4,
};

export const generateSrt = (
	text: string,
	audioDuration: number,
	options: GenerateSrtOptions = {}
): string => {
	const {
		maxChars = 55,
		maxWords = 10,

		punctuationWeight: customPunctuationWeight = {},

		minDuration = 1,
		maxDuration = 7,
	} = options;

	const punctuationWeight: Required<PunctuationWeight> = {
		...DEFAULT_PUNCTUATION_WEIGHT,
		...customPunctuationWeight,
	};

	if (!text?.trim()) {
		return '';
	}

	if (!audioDuration || audioDuration <= 0) {
		return '';
	}

	/**
	 * Convert seconds to SRT timestamp
	 *
	 * Example:
	 * 65.123 -> 00:01:05,123
	 */
	const formatTime = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);

		const minutes = Math.floor(
			(seconds % 3600) / 60
		);

		const secs = Math.floor(seconds % 60);

		const milliseconds = Math.round(
			(seconds % 1) * 1000
		);

		/**
		 * Handle trường hợp milliseconds = 1000
		 */
		if (milliseconds === 1000) {
			return formatTime(
				Math.round(seconds * 1000) / 1000
			);
		}

		return (
			`${String(hours).padStart(2, '0')}:` +
			`${String(minutes).padStart(2, '0')}:` +
			`${String(secs).padStart(2, '0')},` +
			`${String(milliseconds).padStart(3, '0')}`
		);
	};

	/**
	 * Normalize text
	 */
	const normalizedText = text
		.replace(/\s+/g, ' ')
		.trim();

	/**
	 * Split text by sentence
	 *
	 * Support:
	 * .
	 * !
	 * ?
	 */
	const sentences: string[] =
		normalizedText.match(
			/[^.!?]+[.!?]+|[^.!?]+$/g
		) || [];

	const chunks: string[] = [];

	/**
	 * Split long sentence
	 */
	sentences.forEach((sentence: string) => {
		sentence = sentence.trim();

		if (!sentence) {
			return;
		}

		const words = sentence.split(/\s+/);

		/**
		 * Sentence is short enough
		 */
		if (
			sentence.length <= maxChars &&
			words.length <= maxWords
		) {
			chunks.push(sentence);
			return;
		}

		/**
		 * Long sentence
		 *
		 * First priority:
		 * split by comma
		 */
		const parts = sentence
			.split(/(?<=,)\s+/)
			.map((part: string) => part.trim())
			.filter(Boolean);

		let current = '';

		parts.forEach((part: string) => {
			const candidate = current
				? `${current} ${part}`
				: part;

			const candidateWords =
				candidate.split(/\s+/);

			/**
			 * Current chunk is already full
			 */
			if (
				current &&
				(candidate.length > maxChars ||
					candidateWords.length > maxWords)
			) {
				chunks.push(current);

				current = part;
			} else {
				current = candidate;
			}
		});

		if (!current) {
			return;
		}

		const currentWords = current.split(/\s+/);

		/**
		 * Still too long
		 *
		 * Split by words
		 */
		if (
			current.length > maxChars ||
			currentWords.length > maxWords
		) {
			let wordChunk = '';

			currentWords.forEach((word: string) => {
				const candidate = wordChunk
					? `${wordChunk} ${word}`
					: word;

				const candidateWords =
					candidate.split(/\s+/);

				if (
					candidate.length > maxChars ||
					candidateWords.length > maxWords
				) {
					if (wordChunk) {
						chunks.push(wordChunk);
					}

					wordChunk = word;
				} else {
					wordChunk = candidate;
				}
			});

			if (wordChunk) {
				chunks.push(wordChunk);
			}
		} else {
			chunks.push(current);
		}
	});

	/**
	 * Calculate weight of each subtitle
	 */
	const getWeight = (line: string): number => {
		const words = line
			.split(/\s+/)
			.filter(Boolean);

		/**
		 * Base weight = number of words
		 */
		let weight = words.length;

		/**
		 * Comma
		 */
		const commaCount =
			(line.match(/,/g) || []).length;

		weight +=
			commaCount *
			punctuationWeight.comma;

		/**
		 * Ellipsis
		 */
		const ellipsisCount =
			(line.match(/\.\.\./g) || []).length;

		weight +=
			ellipsisCount *
			punctuationWeight.ellipsis;

		/**
		 * Remove ellipsis before checking period
		 */
		const cleanLine = line.replace(
			/\.\.\./g,
			''
		);

		/**
		 * Period
		 */
		const periodCount =
			(cleanLine.match(/\./g) || []).length;

		weight +=
			periodCount *
			punctuationWeight.period;

		/**
		 * Exclamation
		 */
		const exclamationCount =
			(cleanLine.match(/!/g) || []).length;

		weight +=
			exclamationCount *
			punctuationWeight.exclamation;

		/**
		 * Question
		 */
		const questionCount =
			(cleanLine.match(/\?/g) || []).length;

		weight +=
			questionCount *
			punctuationWeight.question;

		return weight;
	};

	/**
	 * Calculate weights
	 */
	const weights = chunks.map(getWeight);

	const totalWeight = weights.reduce(
		(sum: number, weight: number) =>
			sum + weight,
		0
	);

	if (totalWeight <= 0) {
		return '';
	}

	/**
	 * Calculate duration based on weight
	 */
	let durations = weights.map(
		(weight: number) =>
			(weight / totalWeight) * audioDuration
	);

	/**
	 * Apply min / max duration
	 */
	durations = durations.map(
		(duration: number) =>
			Math.min(
				maxDuration,
				Math.max(minDuration, duration)
			)
	);

	/**
	 * Normalize duration
	 *
	 * Make sure total duration matches audio duration
	 */
	const durationSum = durations.reduce(
		(sum: number, duration: number) =>
			sum + duration,
		0
	);

	if (durationSum > 0) {
		const ratio =
			audioDuration / durationSum;

		durations = durations.map(
			(duration: number) =>
				duration * ratio
		);
	}

	/**
	 * Generate SRT
	 */
	let currentTime = 0;

	return chunks
		.map((line: string, index: number) => {
			const startTime = currentTime;

			const endTime =
				index === chunks.length - 1
					? audioDuration
					: currentTime + durations[index];

			currentTime = endTime;

			return [
				index + 1,
				`${formatTime(startTime)} --> ${formatTime(
					endTime
				)}`,
				line,
			].join('\n');
		})
		.join('\n\n');
};