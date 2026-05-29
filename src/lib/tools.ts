import { Download, Image as ImageIcon, FileText, Scissors, FileType, Combine, Minimize2, FileImage, QrCode, ScanLine, ScanText, Sparkles, Volume2, Mic, Film, Lock, Code2, Type, Braces, Palette, Wand2, Stamp, Pencil, FileCode, Monitor, Music, Video, AudioLines, Aperture, ScanFace, Hand, Boxes, Brain, Maximize2, Crop, LayoutGrid, Laugh, CreditCard, Captions, FileMinus, Layers, RotateCw, ScanSearch, FileSearch, FilePen, FileX, Shield, FileOutput, Link, Clock, Moon, Calculator, Activity, CalendarDays, Link2, AlignLeft, Fingerprint, Hash, Shuffle, Users, Gamepad2, Flame, Dices, Joystick, Grid2x2, X, Crosshair, BookOpen, Bomb } from "lucide-react";
// Layers already imported above — reused for Tetris.

export type ToolCategory = "video" | "image" | "pdf" | "text" | "audio" | "ai" | "utility" | "games" | "minigames";

export const categoryMeta: Record<ToolCategory, { label: string; color: string; icon: string }> = {
  video: { label: "Video Tools", color: "var(--cyan-brand)", icon: "🎬" },
  image: { label: "Image Tools", color: "var(--violet-brand)", icon: "🖼️" },
  audio: { label: "Audio Tools", color: "var(--violet-brand)", icon: "🎙️" },
  pdf: { label: "PDF & Documents", color: "var(--orange-brand)", icon: "📄" },
  text: { label: "Text Tools", color: "var(--green-brand)", icon: "✍️" },
  ai: { label: "AI Tools", color: "var(--violet-brand)", icon: "🤖" },
  utility: { label: "Utility Tools", color: "var(--green-brand)", icon: "🛠️" },
  games: { label: "Game Tools", color: "var(--violet-brand)", icon: "🎲" },
  minigames: { label: "Mini Games", color: "var(--cyan-brand)", icon: "🕹️" },
};



export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  categories?: ToolCategory[];
  icon: typeof Download;
  path: string;
  hidden?: boolean;
}

export const toolInCategory = (t: Tool, c: ToolCategory) =>
  t.category === c || (t.categories?.includes(c) ?? false);

export const tools: Tool[] = [
  { slug: "video-downloader", name: "Video Downloader", description: "Download videos from TikTok, Instagram, YouTube and more.", category: "video", icon: Download, path: "/tools/video-downloader", hidden: true },
  { slug: "video-to-gif", name: "Video to GIF", description: "Convert any video clip to a high-quality animated GIF.", category: "video", icon: Film, path: "/tools/video-to-gif" },
  { slug: "video-trimmer", name: "Video Trimmer", description: "Cut and trim video clips instantly in your browser.", category: "video", icon: Scissors, path: "/tools/video-trimmer" },
  { slug: "video-merger", name: "Video Merger", description: "Combine multiple videos into one — no uploads needed.", category: "video", icon: Combine, path: "/tools/video-merger" },
  { slug: "add-subtitles", name: "Add Subtitles to Video", description: "Burn subtitles into any video right in your browser.", category: "video", icon: Captions, path: "/tools/add-subtitles" },
  { slug: "image-converter", name: "Image Converter", description: "Convert PNG, JPG, WebP and AVIF in seconds.", category: "image", icon: FileImage, path: "/tools/image-converter" },
  { slug: "image-compressor", name: "Image Compressor", description: "Shrink images without losing quality.", category: "image", icon: Minimize2, path: "/tools/image-compressor" },
  { slug: "image-upscaler", name: "Image Upscaler", description: "Upscale images 2x or 4x with Real-ESRGAN AI.", category: "image", icon: Sparkles, path: "/tools/image-upscaler" },
  { slug: "remove-bg", name: "Remove Background", description: "Erase image backgrounds with one click.", category: "image", icon: Scissors, path: "/tools/remove-bg" },
  { slug: "pdf-text-extractor", name: "Extract Text from PDF", description: "Extract all text from any PDF instantly.", category: "pdf", icon: FileText, path: "/tools/pdf-text-extractor" },
  { slug: "word-to-pdf", name: "Word to PDF", description: "Turn Word documents into polished PDFs.", category: "pdf", icon: FileType, path: "/tools/word-to-pdf" },
  { slug: "merge-pdf", name: "Merge PDF", description: "Combine multiple PDFs into a single file.", category: "pdf", icon: Combine, path: "/tools/merge-pdf" },
  { slug: "qr-generator", name: "QR Code Generator", description: "Create custom QR codes from any URL or text.", category: "utility", icon: QrCode, path: "/tools/qr-generator" },
  { slug: "qr-reader", name: "QR Code Reader", description: "Decode QR codes from images or your camera.", category: "utility", icon: ScanLine, path: "/tools/qr-reader" },
  { slug: "image-to-text", name: "Image to Text (OCR)", description: "Extract text from images in multiple languages.", category: "image", icon: ScanText, path: "/tools/image-to-text" },
  { slug: "text-to-speech", name: "Text to Speech", description: "Convert text to natural speech in multiple languages.", category: "audio", icon: Volume2, path: "/tools/text-to-speech" },
  { slug: "speech-to-text", name: "Speech to Text", description: "Transcribe your voice to text in real-time.", category: "audio", icon: Mic, path: "/tools/speech-to-text" },
  { slug: "password-generator", name: "Password Generator", description: "Generate strong, secure passwords instantly.", category: "utility", icon: Lock, path: "/tools/password-generator" },
  { slug: "base64", name: "Base64 Encoder / Decoder", description: "Encode plain text to Base64 or decode Base64 strings instantly.", category: "text", icon: Code2, path: "/tools/base64" },
  { slug: "word-counter", name: "Word Counter", description: "Count words, characters, sentences and estimate reading time.", category: "text", icon: Type, path: "/tools/word-counter" },
  { slug: "json-formatter", name: "JSON Formatter", description: "Format, prettify and minify JSON instantly.", category: "text", icon: Braces, path: "/tools/json-formatter" },
  { slug: "color-palette", name: "Color Palette Extractor", description: "Extract the dominant colors from any image instantly.", category: "image", icon: Palette, path: "/tools/color-palette" },
  { slug: "image-filters", name: "Image Filters", description: "Apply beautiful filters to your images instantly in the browser.", category: "image", icon: Wand2, path: "/tools/image-filters" },
  { slug: "add-watermark", name: "Add Watermark", description: "Add custom text watermarks to your images in seconds.", category: "image", icon: Stamp, path: "/tools/add-watermark" },
  { slug: "image-to-sketch", name: "Image to Sketch", description: "Transform any photo into a pencil or charcoal sketch instantly.", category: "image", icon: Pencil, path: "/tools/image-to-sketch" },
  { slug: "markdown-to-html", name: "Markdown to HTML", description: "Convert Markdown to clean HTML with live preview instantly.", category: "text", icon: FileCode, path: "/tools/markdown-to-html" },
  { slug: "screen-recorder", name: "Screen Recorder", description: "Record your screen with audio directly in the browser — no installs needed.", category: "video", icon: Monitor, path: "/tools/screen-recorder" },
  { slug: "split-pdf", name: "Split PDF", description: "Extract specific pages from any PDF file instantly.", category: "pdf", icon: Scissors, path: "/tools/split-pdf" },
  { slug: "audio-converter", name: "Audio Converter", description: "Convert audio files between MP3, WAV, OGG, AAC and FLAC instantly.", category: "audio", icon: Music, path: "/tools/audio-converter" },
  { slug: "video-compressor", name: "Video Compressor", description: "Reduce video file size without losing quality.", category: "video", icon: Video, path: "/tools/video-compressor" },
  { slug: "extract-audio", name: "Extract Audio from Video", description: "Extract MP3, AAC or WAV audio from any video file.", category: "video", icon: AudioLines, path: "/tools/extract-audio" },
  { slug: "background-blur", name: "AI Background Blur", description: "Blur photo or webcam backgrounds in real time with AI.", category: "ai", icon: Aperture, path: "/tools/background-blur" },
  { slug: "face-landmarks", name: "Face Landmarks", description: "Detect 468 facial landmarks on photos or live camera.", category: "ai", icon: ScanFace, path: "/tools/face-landmarks" },
  { slug: "hand-gesture", name: "Hand Gesture Recognition", description: "Recognize hand gestures in real time from your webcam.", category: "ai", icon: Hand, path: "/tools/hand-gesture" },
  { slug: "object-detection", name: "Object Detection", description: "Detect 80+ object classes in images or live video with COCO-SSD.", category: "ai", icon: Boxes, path: "/tools/object-detection" },
  { slug: "sentiment-analysis", name: "AI Sentiment Analysis", description: "Analyze the sentiment of any text — positive, negative or neutral.", category: "ai", icon: Brain, path: "/tools/sentiment-analysis" },
  { slug: "image-resizer", name: "Image Resizer", description: "Resize images by pixels or percentage with quality control.", category: "image", icon: Maximize2, path: "/tools/image-resizer" },
  { slug: "image-cropper", name: "Image Cropper", description: "Crop, rotate and flip images with aspect-ratio presets.", category: "image", icon: Crop, path: "/tools/image-cropper" },
  { slug: "add-text-to-image", name: "Add Text to Image", description: "Add custom, draggable text layers to any image.", category: "image", icon: Type, path: "/tools/add-text-to-image" },
  { slug: "image-to-pdf", name: "Image to PDF", description: "Convert one or many images into a single PDF document.", category: "pdf", categories: ["image", "pdf"], icon: FileImage, path: "/tools/image-to-pdf" },
  { slug: "collage-maker", name: "Photo Collage Maker", description: "Combine 2–9 photos into a beautiful grid collage.", category: "image", icon: LayoutGrid, path: "/tools/collage-maker" },
  { slug: "meme-generator", name: "Meme Generator", description: "Create classic memes from popular templates or your own image.", category: "image", icon: Laugh, path: "/tools/meme-generator" },
  { slug: "business-card-generator", name: "Business Card Generator", description: "Design print-ready business cards with QR codes.", category: "image", icon: CreditCard, path: "/tools/business-card-generator" },
  { slug: "compress-pdf", name: "Compress PDF", description: "Reduce PDF file size while keeping quality.", category: "pdf", icon: FileMinus, path: "/tools/compress-pdf" },
  { slug: "pdf-to-images", name: "PDF to Images", description: "Convert every PDF page into a high-quality PNG image.", category: "pdf", icon: Layers, path: "/tools/pdf-to-images" },
  { slug: "rotate-pdf", name: "Rotate PDF", description: "Rotate one or all pages in your PDF to the correct orientation.", category: "pdf", icon: RotateCw, path: "/tools/rotate-pdf" },
  { slug: "document-scanner", name: "Document Scanner", description: "Scan documents with camera, auto-crop, enhance and export to PDF.", category: "pdf", icon: ScanSearch, path: "/tools/document-scanner" },
  { slug: "pdf-to-word", name: "PDF to Word", description: "Convert PDF files to editable Word documents instantly.", category: "pdf", icon: FileOutput, path: "/tools/pdf-to-word" },
  { slug: "delete-pdf-pages", name: "Delete PDF Pages", description: "Remove unwanted pages from any PDF file.", category: "pdf", icon: FileX, path: "/tools/delete-pdf-pages" },
  { slug: "pdf-page-numbers", name: "Add Page Numbers to PDF", description: "Add page numbers to any PDF with custom position and style.", category: "pdf", icon: FilePen, path: "/tools/pdf-page-numbers" },
  { slug: "protect-pdf", name: "Protect PDF", description: "Add a password to your PDF to prevent unauthorized access.", category: "pdf", icon: Shield, path: "/tools/protect-pdf" },
  { slug: "pdf-reader", name: "PDF Reader", description: "View and read PDF files directly in your browser.", category: "pdf", icon: FileSearch, path: "/tools/pdf-reader" },
  { slug: "spinning-wheel", name: "Spinning Wheel", description: "Spin a customizable wheel to make random decisions. Add your own options.", category: "games", icon: RotateCw, path: "/tools/spinning-wheel" },

  { slug: "link-shortener", name: "Link Shortener", description: "Shorten any URL and generate a QR code for it instantly.", category: "utility", icon: Link, path: "/tools/link-shortener" },
  { slug: "free-time-fixer", name: "Free Time Fixer", description: "Tell us how many minutes you have free — we'll tell you exactly what to do.", category: "utility", icon: Clock, path: "/tools/free-time-fixer" },
  { slug: "sleep-calculator", name: "Sleep Calculator", description: "Find the best time to wake up or go to sleep based on sleep cycles.", category: "utility", icon: Moon, path: "/tools/sleep-calculator" },
  { slug: "tip-calculator", name: "Tip Calculator", description: "Calculate tips and split bills instantly.", category: "utility", icon: Calculator, path: "/tools/tip-calculator" },
  { slug: "bmi-calculator", name: "BMI Calculator", description: "Calculate your Body Mass Index and healthy weight range.", category: "utility", icon: Activity, path: "/tools/bmi-calculator" },
  { slug: "age-calculator", name: "Age Calculator", description: "Calculate your exact age in years, months and days.", category: "utility", icon: CalendarDays, path: "/tools/age-calculator" },
  { slug: "url-encoder", name: "URL Encoder / Decoder", description: "Encode or decode URL-safe strings using percent-encoding instantly.", category: "text", icon: Link2, path: "/tools/url-encoder" },
  { slug: "lorem-ipsum", name: "Lorem Ipsum Generator", description: "Generate placeholder Lorem Ipsum text with custom length and format.", category: "text", icon: AlignLeft, path: "/tools/lorem-ipsum" },
  { slug: "uuid-generator", name: "UUID Generator", description: "Generate random UUID v4 identifiers — single or in bulk.", category: "text", icon: Fingerprint, path: "/tools/uuid-generator" },
  { slug: "hash-generator", name: "Hash Generator", description: "Compute MD5, SHA-1, SHA-256 and SHA-512 hashes from any text.", category: "text", icon: Hash, path: "/tools/hash-generator" },
  { slug: "pdf-watermark-remover", name: "PDF Watermark Remover", description: "Remove watermarks from PDF files entirely in your browser.", category: "pdf", icon: Stamp, path: "/tools/pdf-watermark-remover" },
  { slug: "role-spinner", name: "Role Spinner", description: "Randomly assign roles to players. Perfect for Mafia, party games and team activities.", category: "games", icon: Shuffle, path: "/tools/role-spinner" },
  { slug: "random-team-maker", name: "Random Team Maker", description: "Split any group of players into balanced random teams instantly.", category: "games", icon: Users, path: "/tools/random-team-maker" },
  { slug: "truth-or-dare", name: "Truth or Dare", description: "Spin the bottle and get random Truth or Dare challenges. Perfect for parties and friend groups.", category: "games", icon: Flame, path: "/tools/truth-or-dare" },
  { slug: "dice-roller", name: "Dice Roller", description: "Roll multiple dice of any type — D4, D6, D8, D10, D12, D20. Perfect for board games and RPGs.", category: "games", icon: Dices, path: "/tools/dice-roller" },
  { slug: "wordle", name: "Wordle", description: "Guess the hidden 5-letter word in 6 tries. A new word every day!", category: "minigames", icon: Grid2x2, path: "/tools/wordle" },
  { slug: "2048", name: "2048", description: "Slide tiles and merge numbers to reach 2048. Simple rules, endless challenge.", category: "minigames", icon: Joystick, path: "/tools/2048" },
  { slug: "tic-tac-toe", name: "Tic Tac Toe", description: "Classic X and O game. Play against a friend or challenge the AI.", category: "minigames", icon: X, path: "/tools/tic-tac-toe" },
  { slug: "snake", name: "Snake", description: "Eat the food, grow longer, don't hit the walls. The classic arcade game!", category: "minigames", icon: Crosshair, path: "/tools/snake" },
  { slug: "memory-match", name: "Memory Match", description: "Flip cards and find matching pairs. Train your memory with increasing difficulty!", category: "minigames", icon: LayoutGrid, path: "/tools/memory-match" },
  { slug: "hangman", name: "Hangman", description: "Guess the hidden word letter by letter before the hangman is complete!", category: "minigames", icon: BookOpen, path: "/tools/hangman" },
  { slug: "minesweeper", name: "Minesweeper", description: "Classic Minesweeper — uncover all safe cells without hitting a mine!", category: "minigames", icon: Bomb, path: "/tools/minesweeper" },
  { slug: "sudoku", name: "Sudoku", description: "Fill the 9×9 grid so every row, column and box contains digits 1–9.", category: "minigames", icon: Hash, path: "/tools/sudoku" },
];


