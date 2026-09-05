'use client';

import { useState } from 'react';
import { generateSrt } from '@/utils/srtGenerator';

export default function SrtGenerator() {
	const [text, setText] = useState('');
	const [audioDuration, setAudioDuration] =
		useState('');
	const [srt, setSrt] = useState('');

	const handleGenerate = () => {
		const result = generateSrt(
			text,
			Number(audioDuration)
		);

		setSrt(result);
	};

	const handleCopy = async () => {
		if (!srt) return;

		await navigator.clipboard.writeText(srt);
	};

	const handleDownload = () => {
		if (!srt) return;

		const blob = new Blob([srt], {
			type: 'text/plain;charset=utf-8',
		});

		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');

		a.href = url;
		a.download = 'subtitle.srt';

		a.click();

		URL.revokeObjectURL(url);
	};

	return (
		<div className="min-h-screen p-6">
			<div className="mx-auto max-w-7xl">
				<h1 className="mb-2 text-3xl font-bold">
					SRT Generator
				</h1>

				<p className="mb-8 text-gray-500">
					Generate subtitle timing based on
					text, punctuation and audio duration.
				</p>

				<div className="grid gap-6 lg:grid-cols-2">
					{/* LEFT */}
					<div className="rounded-xl p-6 shadow-sm">
						<h2 className="mb-4 text-lg font-semibold">
							Input
						</h2>

						<label className="mb-2 block text-sm font-medium">
							Script
						</label>

						<textarea
							value={text}
							onChange={(e) =>
								setText(e.target.value)
							}
							placeholder="Paste your script here..."
							className="h-80 w-full resize-none rounded-lg border border-gray-300 p-4 outline-none"
						/>

						<div className="mt-4">
							<label className="mb-2 block text-sm font-medium">
								Audio duration (seconds)
							</label>

							<input
								type="number"
								min="1"
								step="0.1"
								value={audioDuration}
								onChange={(e) =>
									setAudioDuration(
										e.target.value
									)
								}
								placeholder="60"
								className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-black"
							/>
						</div>

						<button
							onClick={handleGenerate}
							className="mt-6 w-full rounded-lg bg-black px-4 py-3 font-medium text-white bg-gray-800 cursor-pointer"
						>
							Generate SRT
						</button>
					</div>

					{/* RIGHT */}
					<div className="rounded-xl p-6 shadow-sm">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-lg font-semibold">
								SRT Preview
							</h2>

							<div className="flex gap-2">
								<button
									onClick={handleCopy}
									disabled={!srt}
									className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
								>
									Copy
								</button>

								<button
									onClick={handleDownload}
									disabled={!srt}
									className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-40"
								>
									Download
								</button>
							</div>
						</div>

						<textarea
							value={srt}
							readOnly
							placeholder="Generated SRT will appear here..."
							className="h-[500px] w-full resize-none border rounded-lg p-4 font-mono text-sm outline-none"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}