import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  Printer,
  FileDown,
  FileSpreadsheet,
  Files,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Globe2,
} from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { loadScript } from "@/lib/cdnScript";

export const Route = createFileRoute("/tools/timetable-generator")({
  head: () => buildToolMeta(toolBySlug("timetable-generator", tools)),
  component: TimetableGeneratorPage,
});

// ---------- i18n ----------

type LangCode = "en" | "fr" | "ar" | "es" | "pt" | "de" | "tr" | "id" | "sw" | "ru";

const LANGUAGES: { code: LangCode; flag: string; name: string }[] = [
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "ar", flag: "🇸🇦", name: "العربية" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "pt", flag: "🇵🇹", name: "Português" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "tr", flag: "🇹🇷", name: "Türkçe" },
  { code: "id", flag: "🇮🇩", name: "Indonesia" },
  { code: "sw", flag: "🇰🇪", name: "Kiswahili" },
  { code: "ru", flag: "🇷🇺", name: "Русский" },
];

type Dict = {
  step1: string; step2: string; step3: string; step4: string; result: string;
  next: string; back: string;
  schoolName: string; schoolNamePh: string;
  address: string; addressPh: string;
  academicYear: string; academicYearPh: string;
  logo: string; stamp: string; uploadHint: string;
  daysPerWeek: string; periodsPerDay: string; periodDuration: string; minutes: string;
  breakPeriods: string; breakPeriodsHint: string;
  period: string; breakLabel: string;
  subjects: string; addSubject: string; subjectName: string; subjectColor: string;
  sessionsPerWeek: string; teachers: string; addTeacher: string; teacherName: string;
  classes: string; addClass: string; className: string; selectSubjects: string; teacher: string;
  classSummary: string; subject: string;
  generate: string; generating: string; regenerate: string;
  schoolHeader: string; tabClass: string;
  print: string; pdf: string; excel: string; pdfAll: string;
  warnCapacity: string; warnConflicts: string;
  validateSchool: string; validateSubjects: string; validateClasses: string;
  noStored: string;
  days: string[]; // Mon..Sat
  toolTitle: string; toolDesc: string;
};

const T: Record<LangCode, Dict> = {
  en: {
    step1: "School Setup", step2: "Subjects & Teachers", step3: "Classes", step4: "Generate", result: "Result",
    next: "Next", back: "Back",
    schoolName: "School name", schoolNamePh: "e.g. Lincoln High School",
    address: "Address or motto (optional)", addressPh: "e.g. 123 Main St — Excellence in Education",
    academicYear: "Academic year", academicYearPh: "e.g. 2025-2026",
    logo: "School logo", stamp: "Official stamp (optional)", uploadHint: "PNG, JPG or SVG",
    daysPerWeek: "Days per week", periodsPerDay: "Periods per day", periodDuration: "Period duration", minutes: "min",
    breakPeriods: "Break periods", breakPeriodsHint: "Tick which periods are breaks (e.g. recess, lunch).",
    period: "Period", breakLabel: "— Break —",
    subjects: "Subjects", addSubject: "Add subject", subjectName: "Subject name", subjectColor: "Color",
    sessionsPerWeek: "Sessions / week", teachers: "Teachers", addTeacher: "Add teacher", teacherName: "Teacher name",
    classes: "Classes", addClass: "Add class", className: "Class name", selectSubjects: "Subjects taught",
    teacher: "Teacher", classSummary: "Class summary", subject: "Subject",
    generate: "Generate timetable", generating: "Generating…", regenerate: "Regenerate",
    schoolHeader: "School header", tabClass: "Class",
    print: "Print", pdf: "Export PDF", excel: "Export Excel", pdfAll: "All classes PDF",
    warnCapacity: "Too many sessions for the available slots. Reduce sessions or add periods.",
    warnConflicts: "Some sessions could not be placed without conflicts. Adjust teachers or sessions.",
    validateSchool: "Please enter the school name and academic year.",
    validateSubjects: "Add at least one subject with a teacher.",
    validateClasses: "Add at least one class and assign subjects with teachers.",
    noStored: "No data is stored on our servers",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    toolTitle: "School Timetable Generator",
    toolDesc: "Build, customize and export complete school timetables in 10 languages — all in your browser.",
  },
  fr: {
    step1: "Configuration", step2: "Matières & Enseignants", step3: "Classes", step4: "Générer", result: "Résultat",
    next: "Suivant", back: "Retour",
    schoolName: "Nom de l'école", schoolNamePh: "ex. Lycée Victor Hugo",
    address: "Adresse ou devise (facultatif)", addressPh: "ex. 12 rue de la Paix — Savoir et Réussite",
    academicYear: "Année scolaire", academicYearPh: "ex. 2025-2026",
    logo: "Logo de l'école", stamp: "Cachet officiel (facultatif)", uploadHint: "PNG, JPG ou SVG",
    daysPerWeek: "Jours par semaine", periodsPerDay: "Heures par jour", periodDuration: "Durée d'une heure", minutes: "min",
    breakPeriods: "Récréations", breakPeriodsHint: "Cochez les heures qui sont des pauses (récréation, déjeuner).",
    period: "Heure", breakLabel: "— Pause —",
    subjects: "Matières", addSubject: "Ajouter une matière", subjectName: "Nom de la matière", subjectColor: "Couleur",
    sessionsPerWeek: "Séances / semaine", teachers: "Enseignants", addTeacher: "Ajouter un enseignant", teacherName: "Nom de l'enseignant",
    classes: "Classes", addClass: "Ajouter une classe", className: "Nom de la classe", selectSubjects: "Matières enseignées",
    teacher: "Enseignant", classSummary: "Récapitulatif", subject: "Matière",
    generate: "Générer l'emploi du temps", generating: "Génération…", regenerate: "Régénérer",
    schoolHeader: "En-tête", tabClass: "Classe",
    print: "Imprimer", pdf: "Exporter PDF", excel: "Exporter Excel", pdfAll: "PDF toutes classes",
    warnCapacity: "Trop de séances pour le nombre de créneaux. Réduisez les séances ou ajoutez des heures.",
    warnConflicts: "Certaines séances n'ont pas pu être placées sans conflit. Ajustez les enseignants ou séances.",
    validateSchool: "Veuillez saisir le nom de l'école et l'année scolaire.",
    validateSubjects: "Ajoutez au moins une matière avec un enseignant.",
    validateClasses: "Ajoutez au moins une classe avec ses matières et enseignants.",
    noStored: "Aucune donnée n'est stockée sur nos serveurs",
    days: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
    toolTitle: "Générateur d'emploi du temps scolaire",
    toolDesc: "Créez, personnalisez et exportez des emplois du temps complets en 10 langues — dans votre navigateur.",
  },
  ar: {
    step1: "إعداد المدرسة", step2: "المواد والأساتذة", step3: "الأقسام", step4: "إنشاء", result: "النتيجة",
    next: "التالي", back: "السابق",
    schoolName: "اسم المدرسة", schoolNamePh: "مثال: مدرسة النور",
    address: "العنوان أو الشعار (اختياري)", addressPh: "مثال: شارع الاستقلال — العلم نور",
    academicYear: "السنة الدراسية", academicYearPh: "مثال: 2025-2026",
    logo: "شعار المدرسة", stamp: "الختم الرسمي (اختياري)", uploadHint: "PNG أو JPG أو SVG",
    daysPerWeek: "أيام الأسبوع", periodsPerDay: "الحصص في اليوم", periodDuration: "مدة الحصة", minutes: "دقيقة",
    breakPeriods: "الاستراحات", breakPeriodsHint: "اختر الحصص التي تكون استراحات (فسحة، غداء).",
    period: "الحصة", breakLabel: "— استراحة —",
    subjects: "المواد", addSubject: "إضافة مادة", subjectName: "اسم المادة", subjectColor: "اللون",
    sessionsPerWeek: "الحصص / أسبوع", teachers: "الأساتذة", addTeacher: "إضافة أستاذ", teacherName: "اسم الأستاذ",
    classes: "الأقسام", addClass: "إضافة قسم", className: "اسم القسم", selectSubjects: "المواد المُدرَّسة",
    teacher: "الأستاذ", classSummary: "ملخص القسم", subject: "المادة",
    generate: "إنشاء الجدول", generating: "جاري الإنشاء…", regenerate: "إعادة الإنشاء",
    schoolHeader: "ترويسة", tabClass: "القسم",
    print: "طباعة", pdf: "تصدير PDF", excel: "تصدير Excel", pdfAll: "PDF لكل الأقسام",
    warnCapacity: "عدد الحصص أكبر من المتاح. قلِّل الحصص أو زِد عددها في اليوم.",
    warnConflicts: "تعذّر وضع بعض الحصص دون تعارض. عدِّل الأساتذة أو عدد الحصص.",
    validateSchool: "يرجى إدخال اسم المدرسة والسنة الدراسية.",
    validateSubjects: "أضف مادة واحدة على الأقل مع أستاذ.",
    validateClasses: "أضف قسماً واحداً على الأقل وحدّد مواده وأساتذته.",
    noStored: "لا يتم تخزين أي بيانات على خوادمنا",
    days: ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    toolTitle: "مولّد الجداول الدراسية",
    toolDesc: "أنشئ، خصّص وصدّر جداول دراسية كاملة بـ 10 لغات — كل ذلك داخل متصفحك.",
  },
  es: {
    step1: "Configuración", step2: "Materias y Profesores", step3: "Clases", step4: "Generar", result: "Resultado",
    next: "Siguiente", back: "Atrás",
    schoolName: "Nombre de la escuela", schoolNamePh: "ej. Colegio San Martín",
    address: "Dirección o lema (opcional)", addressPh: "ej. Av. Libertad 123 — Educar para el futuro",
    academicYear: "Año académico", academicYearPh: "ej. 2025-2026",
    logo: "Logo de la escuela", stamp: "Sello oficial (opcional)", uploadHint: "PNG, JPG o SVG",
    daysPerWeek: "Días por semana", periodsPerDay: "Períodos por día", periodDuration: "Duración del período", minutes: "min",
    breakPeriods: "Recreos", breakPeriodsHint: "Marca qué períodos son recreos (recreo, almuerzo).",
    period: "Período", breakLabel: "— Recreo —",
    subjects: "Materias", addSubject: "Añadir materia", subjectName: "Nombre de la materia", subjectColor: "Color",
    sessionsPerWeek: "Sesiones / semana", teachers: "Profesores", addTeacher: "Añadir profesor", teacherName: "Nombre del profesor",
    classes: "Clases", addClass: "Añadir clase", className: "Nombre de la clase", selectSubjects: "Materias impartidas",
    teacher: "Profesor", classSummary: "Resumen", subject: "Materia",
    generate: "Generar horario", generating: "Generando…", regenerate: "Regenerar",
    schoolHeader: "Encabezado", tabClass: "Clase",
    print: "Imprimir", pdf: "Exportar PDF", excel: "Exportar Excel", pdfAll: "PDF todas las clases",
    warnCapacity: "Demasiadas sesiones para los espacios disponibles.",
    warnConflicts: "No se pudieron colocar algunas sesiones sin conflictos.",
    validateSchool: "Introduce el nombre de la escuela y el año académico.",
    validateSubjects: "Añade al menos una materia con profesor.",
    validateClasses: "Añade al menos una clase y asigna materias con profesores.",
    noStored: "No se almacenan datos en nuestros servidores",
    days: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
    toolTitle: "Generador de horarios escolares",
    toolDesc: "Crea, personaliza y exporta horarios escolares completos en 10 idiomas — en tu navegador.",
  },
  pt: {
    step1: "Configuração", step2: "Disciplinas e Professores", step3: "Turmas", step4: "Gerar", result: "Resultado",
    next: "Próximo", back: "Voltar",
    schoolName: "Nome da escola", schoolNamePh: "ex. Escola Dom Pedro",
    address: "Endereço ou lema (opcional)", addressPh: "ex. Rua das Flores 45 — Educar é transformar",
    academicYear: "Ano letivo", academicYearPh: "ex. 2025-2026",
    logo: "Logo da escola", stamp: "Carimbo oficial (opcional)", uploadHint: "PNG, JPG ou SVG",
    daysPerWeek: "Dias por semana", periodsPerDay: "Aulas por dia", periodDuration: "Duração da aula", minutes: "min",
    breakPeriods: "Intervalos", breakPeriodsHint: "Marque quais aulas são intervalos (recreio, almoço).",
    period: "Aula", breakLabel: "— Intervalo —",
    subjects: "Disciplinas", addSubject: "Adicionar disciplina", subjectName: "Nome da disciplina", subjectColor: "Cor",
    sessionsPerWeek: "Aulas / semana", teachers: "Professores", addTeacher: "Adicionar professor", teacherName: "Nome do professor",
    classes: "Turmas", addClass: "Adicionar turma", className: "Nome da turma", selectSubjects: "Disciplinas",
    teacher: "Professor", classSummary: "Resumo da turma", subject: "Disciplina",
    generate: "Gerar horário", generating: "Gerando…", regenerate: "Regerar",
    schoolHeader: "Cabeçalho", tabClass: "Turma",
    print: "Imprimir", pdf: "Exportar PDF", excel: "Exportar Excel", pdfAll: "PDF todas as turmas",
    warnCapacity: "Aulas demais para os horários disponíveis.",
    warnConflicts: "Algumas aulas não puderam ser alocadas sem conflitos.",
    validateSchool: "Insira o nome da escola e o ano letivo.",
    validateSubjects: "Adicione pelo menos uma disciplina com professor.",
    validateClasses: "Adicione pelo menos uma turma com disciplinas e professores.",
    noStored: "Nenhum dado é armazenado em nossos servidores",
    days: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
    toolTitle: "Gerador de horários escolares",
    toolDesc: "Crie, personalize e exporte horários escolares em 10 idiomas — direto no seu navegador.",
  },
  de: {
    step1: "Schule einrichten", step2: "Fächer & Lehrer", step3: "Klassen", step4: "Erstellen", result: "Ergebnis",
    next: "Weiter", back: "Zurück",
    schoolName: "Schulname", schoolNamePh: "z.B. Gymnasium am Park",
    address: "Adresse oder Motto (optional)", addressPh: "z.B. Hauptstr. 12 — Bildung mit Herz",
    academicYear: "Schuljahr", academicYearPh: "z.B. 2025-2026",
    logo: "Schullogo", stamp: "Offizieller Stempel (optional)", uploadHint: "PNG, JPG oder SVG",
    daysPerWeek: "Tage pro Woche", periodsPerDay: "Stunden pro Tag", periodDuration: "Stundendauer", minutes: "min",
    breakPeriods: "Pausen", breakPeriodsHint: "Markieren Sie, welche Stunden Pausen sind.",
    period: "Stunde", breakLabel: "— Pause —",
    subjects: "Fächer", addSubject: "Fach hinzufügen", subjectName: "Fachname", subjectColor: "Farbe",
    sessionsPerWeek: "Stunden / Woche", teachers: "Lehrer", addTeacher: "Lehrer hinzufügen", teacherName: "Lehrername",
    classes: "Klassen", addClass: "Klasse hinzufügen", className: "Klassenname", selectSubjects: "Unterrichtete Fächer",
    teacher: "Lehrer", classSummary: "Übersicht", subject: "Fach",
    generate: "Stundenplan erstellen", generating: "Erstellen…", regenerate: "Neu erstellen",
    schoolHeader: "Kopfzeile", tabClass: "Klasse",
    print: "Drucken", pdf: "PDF exportieren", excel: "Excel exportieren", pdfAll: "PDF aller Klassen",
    warnCapacity: "Zu viele Stunden für die verfügbaren Slots.",
    warnConflicts: "Einige Stunden konnten nicht konfliktfrei platziert werden.",
    validateSchool: "Bitte Schulname und Schuljahr eingeben.",
    validateSubjects: "Mindestens ein Fach mit Lehrer hinzufügen.",
    validateClasses: "Mindestens eine Klasse mit Fächern und Lehrern hinzufügen.",
    noStored: "Es werden keine Daten auf unseren Servern gespeichert",
    days: ["Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    toolTitle: "Schul-Stundenplan-Generator",
    toolDesc: "Erstellen, anpassen und exportieren Sie vollständige Stundenpläne in 10 Sprachen — direkt im Browser.",
  },
  tr: {
    step1: "Okul Ayarları", step2: "Dersler ve Öğretmenler", step3: "Sınıflar", step4: "Oluştur", result: "Sonuç",
    next: "İleri", back: "Geri",
    schoolName: "Okul adı", schoolNamePh: "örn. Atatürk Lisesi",
    address: "Adres veya slogan (isteğe bağlı)", addressPh: "örn. Cumhuriyet Cad. 12 — Geleceğe ışık",
    academicYear: "Eğitim yılı", academicYearPh: "örn. 2025-2026",
    logo: "Okul logosu", stamp: "Resmi mühür (isteğe bağlı)", uploadHint: "PNG, JPG veya SVG",
    daysPerWeek: "Haftalık gün sayısı", periodsPerDay: "Günlük ders sayısı", periodDuration: "Ders süresi", minutes: "dk",
    breakPeriods: "Teneffüsler", breakPeriodsHint: "Hangi derslerin teneffüs olduğunu işaretleyin.",
    period: "Ders", breakLabel: "— Teneffüs —",
    subjects: "Dersler", addSubject: "Ders ekle", subjectName: "Ders adı", subjectColor: "Renk",
    sessionsPerWeek: "Haftalık saat", teachers: "Öğretmenler", addTeacher: "Öğretmen ekle", teacherName: "Öğretmen adı",
    classes: "Sınıflar", addClass: "Sınıf ekle", className: "Sınıf adı", selectSubjects: "İşlenen dersler",
    teacher: "Öğretmen", classSummary: "Sınıf özeti", subject: "Ders",
    generate: "Ders programı oluştur", generating: "Oluşturuluyor…", regenerate: "Yeniden oluştur",
    schoolHeader: "Başlık", tabClass: "Sınıf",
    print: "Yazdır", pdf: "PDF dışa aktar", excel: "Excel dışa aktar", pdfAll: "Tüm sınıflar PDF",
    warnCapacity: "Mevcut saatler için çok fazla ders var.",
    warnConflicts: "Bazı dersler çakışmasız yerleştirilemedi.",
    validateSchool: "Okul adını ve eğitim yılını girin.",
    validateSubjects: "En az bir ders ve öğretmen ekleyin.",
    validateClasses: "En az bir sınıf ekleyin ve dersleri öğretmenlerle eşleştirin.",
    noStored: "Sunucularımızda hiçbir veri saklanmaz",
    days: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
    toolTitle: "Okul Ders Programı Oluşturucu",
    toolDesc: "10 dilde okul ders programları oluşturun, özelleştirin ve dışa aktarın — tarayıcınızda.",
  },
  id: {
    step1: "Pengaturan", step2: "Mapel & Guru", step3: "Kelas", step4: "Hasilkan", result: "Hasil",
    next: "Lanjut", back: "Kembali",
    schoolName: "Nama sekolah", schoolNamePh: "mis. SMA Negeri 1",
    address: "Alamat atau motto (opsional)", addressPh: "mis. Jl. Merdeka 12 — Cerdas dan Berakhlak",
    academicYear: "Tahun ajaran", academicYearPh: "mis. 2025-2026",
    logo: "Logo sekolah", stamp: "Stempel resmi (opsional)", uploadHint: "PNG, JPG atau SVG",
    daysPerWeek: "Hari per minggu", periodsPerDay: "Jam pelajaran per hari", periodDuration: "Durasi jam pelajaran", minutes: "menit",
    breakPeriods: "Istirahat", breakPeriodsHint: "Tandai jam mana yang merupakan istirahat.",
    period: "Jam", breakLabel: "— Istirahat —",
    subjects: "Mata Pelajaran", addSubject: "Tambah mapel", subjectName: "Nama mapel", subjectColor: "Warna",
    sessionsPerWeek: "Pertemuan / minggu", teachers: "Guru", addTeacher: "Tambah guru", teacherName: "Nama guru",
    classes: "Kelas", addClass: "Tambah kelas", className: "Nama kelas", selectSubjects: "Mapel yang diajarkan",
    teacher: "Guru", classSummary: "Ringkasan kelas", subject: "Mapel",
    generate: "Buat jadwal", generating: "Membuat…", regenerate: "Buat ulang",
    schoolHeader: "Kop", tabClass: "Kelas",
    print: "Cetak", pdf: "Ekspor PDF", excel: "Ekspor Excel", pdfAll: "PDF semua kelas",
    warnCapacity: "Terlalu banyak pertemuan untuk slot yang tersedia.",
    warnConflicts: "Beberapa pertemuan tidak dapat ditempatkan tanpa konflik.",
    validateSchool: "Masukkan nama sekolah dan tahun ajaran.",
    validateSubjects: "Tambahkan minimal satu mapel dengan guru.",
    validateClasses: "Tambahkan minimal satu kelas dengan mapel dan guru.",
    noStored: "Tidak ada data yang disimpan di server kami",
    days: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
    toolTitle: "Generator Jadwal Sekolah",
    toolDesc: "Buat, sesuaikan, dan ekspor jadwal sekolah lengkap dalam 10 bahasa — di browser Anda.",
  },
  sw: {
    step1: "Mipangilio ya Shule", step2: "Masomo na Walimu", step3: "Madarasa", step4: "Tengeneza", result: "Matokeo",
    next: "Endelea", back: "Rudi",
    schoolName: "Jina la shule", schoolNamePh: "mfano Shule ya Upendo",
    address: "Anwani au kauli mbiu (hiari)", addressPh: "mfano Mtaa wa Uhuru 12 — Elimu ni Mwanga",
    academicYear: "Mwaka wa masomo", academicYearPh: "mfano 2025-2026",
    logo: "Nembo ya shule", stamp: "Muhuri rasmi (hiari)", uploadHint: "PNG, JPG au SVG",
    daysPerWeek: "Siku kwa wiki", periodsPerDay: "Vipindi kwa siku", periodDuration: "Muda wa kipindi", minutes: "dakika",
    breakPeriods: "Mapumziko", breakPeriodsHint: "Weka alama kwenye vipindi vya mapumziko.",
    period: "Kipindi", breakLabel: "— Mapumziko —",
    subjects: "Masomo", addSubject: "Ongeza somo", subjectName: "Jina la somo", subjectColor: "Rangi",
    sessionsPerWeek: "Vipindi / wiki", teachers: "Walimu", addTeacher: "Ongeza mwalimu", teacherName: "Jina la mwalimu",
    classes: "Madarasa", addClass: "Ongeza darasa", className: "Jina la darasa", selectSubjects: "Masomo yanayofundishwa",
    teacher: "Mwalimu", classSummary: "Muhtasari", subject: "Somo",
    generate: "Tengeneza ratiba", generating: "Inatengenezwa…", regenerate: "Tengeneza tena",
    schoolHeader: "Kichwa", tabClass: "Darasa",
    print: "Chapisha", pdf: "Hamisha PDF", excel: "Hamisha Excel", pdfAll: "PDF madarasa yote",
    warnCapacity: "Vipindi vingi kuliko nafasi zilizopo.",
    warnConflicts: "Baadhi ya vipindi havikuwekwa bila migongano.",
    validateSchool: "Tafadhali andika jina la shule na mwaka wa masomo.",
    validateSubjects: "Ongeza somo angalau moja na mwalimu.",
    validateClasses: "Ongeza darasa angalau moja na masomo na walimu.",
    noStored: "Hakuna data inayohifadhiwa kwenye seva zetu",
    days: ["Jtt", "Jnn", "Jtn", "Alh", "Iju", "Jmo"],
    toolTitle: "Kitengenezaji cha Ratiba ya Shule",
    toolDesc: "Tengeneza, sanidi na hamisha ratiba kamili za shule kwa lugha 10 — kwenye kivinjari chako.",
  },
  ru: {
    step1: "Настройки школы", step2: "Предметы и учителя", step3: "Классы", step4: "Создать", result: "Результат",
    next: "Далее", back: "Назад",
    schoolName: "Название школы", schoolNamePh: "например, Школа №1",
    address: "Адрес или девиз (необяз.)", addressPh: "например, ул. Ленина 12 — Знание — сила",
    academicYear: "Учебный год", academicYearPh: "например, 2025-2026",
    logo: "Логотип школы", stamp: "Официальная печать (необяз.)", uploadHint: "PNG, JPG или SVG",
    daysPerWeek: "Дней в неделю", periodsPerDay: "Уроков в день", periodDuration: "Длительность урока", minutes: "мин",
    breakPeriods: "Перемены", breakPeriodsHint: "Отметьте уроки, которые являются переменами.",
    period: "Урок", breakLabel: "— Перемена —",
    subjects: "Предметы", addSubject: "Добавить предмет", subjectName: "Название предмета", subjectColor: "Цвет",
    sessionsPerWeek: "Уроков / неделю", teachers: "Учителя", addTeacher: "Добавить учителя", teacherName: "Имя учителя",
    classes: "Классы", addClass: "Добавить класс", className: "Название класса", selectSubjects: "Предметы",
    teacher: "Учитель", classSummary: "Сводка", subject: "Предмет",
    generate: "Составить расписание", generating: "Создание…", regenerate: "Пересоздать",
    schoolHeader: "Заголовок", tabClass: "Класс",
    print: "Печать", pdf: "Экспорт PDF", excel: "Экспорт Excel", pdfAll: "PDF всех классов",
    warnCapacity: "Слишком много уроков для доступных слотов.",
    warnConflicts: "Некоторые уроки не удалось разместить без конфликтов.",
    validateSchool: "Введите название школы и учебный год.",
    validateSubjects: "Добавьте хотя бы один предмет с учителем.",
    validateClasses: "Добавьте хотя бы один класс с предметами и учителями.",
    noStored: "Данные не хранятся на наших серверах",
    days: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
    toolTitle: "Генератор школьного расписания",
    toolDesc: "Создавайте, настраивайте и экспортируйте расписания на 10 языках — прямо в браузере.",
  },
};

// ---------- Types ----------

interface Subject {
  id: string;
  name: string;
  color: string;
  sessions: number;
  teachers: string[]; // teacher names
}

interface ClassAssignment {
  subjectId: string;
  teacher: string; // chosen teacher name
}

interface ClassRoom {
  id: string;
  name: string;
  assignments: ClassAssignment[];
}

interface SchoolInfo {
  name: string;
  address: string;
  year: string;
  logo: string; // dataURL
  stamp: string; // dataURL
  days: number;
  periods: number;
  duration: number;
  breaks: number[]; // 0-indexed period numbers that are breaks
}

type Cell = { subject: string; teacher: string; color: string } | null;
type ClassGrid = Cell[][]; // [period][day]

// ---------- Helpers ----------

const uid = () => Math.random().toString(36).slice(2, 10);
const DEFAULT_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#fb7185", "#22d3ee", "#f59e0b", "#84cc16", "#e879f9"];

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

function shuffle<T>(a: T[]): T[] {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateTimetable(
  school: SchoolInfo,
  subjects: Subject[],
  classes: ClassRoom[],
): { grids: Record<string, ClassGrid>; unplaced: number } {
  const grids: Record<string, ClassGrid> = {};
  const teacherBusy: Record<string, boolean>[][] = []; // [period][day] => map
  for (let p = 0; p < school.periods; p++) {
    teacherBusy.push([]);
    for (let d = 0; d < school.days; d++) teacherBusy[p].push({});
  }
  for (const c of classes) {
    const g: ClassGrid = [];
    for (let p = 0; p < school.periods; p++) {
      g.push(new Array(school.days).fill(null));
    }
    grids[c.id] = g;
  }

  let unplaced = 0;

  // Build per-class slot list (non-break) and per-class session pool
  for (const c of classes) {
    // Build session pool: list of {subjectId, teacher, color, name} repeated by sessions
    const pool: { subject: string; teacher: string; color: string }[] = [];
    for (const a of c.assignments) {
      const sub = subjects.find((s) => s.id === a.subjectId);
      if (!sub) continue;
      for (let i = 0; i < sub.sessions; i++) {
        pool.push({ subject: sub.name, teacher: a.teacher, color: sub.color });
      }
    }

    // Try multiple attempts to minimize unplaced
    let best: { grid: ClassGrid; left: number } | null = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      const tryGrid: ClassGrid = [];
      for (let p = 0; p < school.periods; p++) tryGrid.push(new Array(school.days).fill(null));
      const tryBusy: Record<string, Record<string, boolean>> = {};
      const k = (p: number, d: number) => `${p}-${d}`;
      // copy global busy
      for (let p = 0; p < school.periods; p++) for (let d = 0; d < school.days; d++) {
        tryBusy[k(p, d)] = { ...teacherBusy[p][d] };
      }
      const slots: { p: number; d: number }[] = [];
      for (let p = 0; p < school.periods; p++) {
        if (school.breaks.includes(p)) continue;
        for (let d = 0; d < school.days; d++) slots.push({ p, d });
      }
      const shuffledSlots = shuffle(slots);
      const shuffledPool = shuffle(pool);
      let left = 0;
      // place each item in the first slot where teacher is not busy and slot empty
      for (const item of shuffledPool) {
        let placed = false;
        for (const s of shuffledSlots) {
          if (tryGrid[s.p][s.d]) continue;
          if (item.teacher && tryBusy[k(s.p, s.d)][item.teacher]) continue;
          tryGrid[s.p][s.d] = item;
          if (item.teacher) tryBusy[k(s.p, s.d)][item.teacher] = true;
          placed = true;
          break;
        }
        if (!placed) left++;
      }
      if (!best || left < best.left) {
        best = { grid: tryGrid, left };
        if (left === 0) break;
      }
    }

    if (best) {
      grids[c.id] = best.grid;
      unplaced += best.left;
      // commit to global teacherBusy
      for (let p = 0; p < school.periods; p++) {
        for (let d = 0; d < school.days; d++) {
          const cell = best.grid[p][d];
          if (cell && cell.teacher) teacherBusy[p][d][cell.teacher] = true;
        }
      }
    }
  }

  return { grids, unplaced };
}

// ---------- Component ----------

function TimetableGeneratorPage() {
  const [lang, setLang] = useState<LangCode>("en");
  const t = T[lang];
  const isRTL = lang === "ar";

  const [step, setStep] = useState(0); // 0..3 wizard, 4 result
  const [school, setSchool] = useState<SchoolInfo>({
    name: "",
    address: "",
    year: "",
    logo: "",
    stamp: "",
    days: 5,
    periods: 6,
    duration: 45,
    breaks: [],
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [grids, setGrids] = useState<Record<string, ClassGrid> | null>(null);
  const [activeClass, setActiveClass] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);

  const logoInput = useRef<HTMLInputElement>(null);
  const stampInput = useRef<HTMLInputElement>(null);

  const totalSteps = 4;
  const progress = step === 4 ? 100 : ((step + 1) / (totalSteps + 1)) * 100;

  const stepLabels = [t.step1, t.step2, t.step3, t.step4, t.result];

  const validateAndNext = () => {
    setError(null);
    if (step === 0) {
      if (!school.name.trim() || !school.year.trim()) { setError(t.validateSchool); return; }
    }
    if (step === 1) {
      if (subjects.length === 0 || subjects.some((s) => !s.name.trim() || s.teachers.filter((x) => x.trim()).length === 0)) {
        setError(t.validateSubjects); return;
      }
    }
    if (step === 2) {
      if (classes.length === 0 || classes.some((c) => !c.name.trim() || c.assignments.length === 0 || c.assignments.some((a) => !a.teacher))) {
        setError(t.validateClasses); return;
      }
    }
    setStep(step + 1);
  };

  const doGenerate = async () => {
    setError(null);
    setWarning(null);
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 350));
    const { grids: g, unplaced } = generateTimetable(school, subjects, classes);
    setGrids(g);
    setActiveClass(classes[0]?.id ?? "");
    // Capacity check
    const cap = school.days * (school.periods - school.breaks.length);
    const overCapacity = classes.some((c) => {
      const total = c.assignments.reduce((s, a) => s + (subjects.find((x) => x.id === a.subjectId)?.sessions ?? 0), 0);
      return total > cap;
    });
    if (overCapacity) setWarning(t.warnCapacity);
    else if (unplaced > 0) setWarning(t.warnConflicts);
    setStep(4);
    setGenerating(false);
  };

  // ---- Step 1 handlers ----
  const onLogo = async (f: File | null, kind: "logo" | "stamp") => {
    if (!f) return;
    const data = await readFileAsDataURL(f);
    setSchool((s) => ({ ...s, [kind]: data }));
  };
  const toggleBreak = (p: number) => {
    setSchool((s) => ({
      ...s,
      breaks: s.breaks.includes(p) ? s.breaks.filter((x) => x !== p) : [...s.breaks, p].sort((a, b) => a - b),
    }));
  };

  // ---- Step 2 handlers ----
  const addSubject = () => setSubjects((s) => [
    ...s,
    { id: uid(), name: "", color: DEFAULT_COLORS[s.length % DEFAULT_COLORS.length], sessions: 2, teachers: [""] },
  ]);
  const updateSubject = (id: string, patch: Partial<Subject>) =>
    setSubjects((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeSubject = (id: string) => {
    setSubjects((s) => s.filter((x) => x.id !== id));
    setClasses((cs) => cs.map((c) => ({ ...c, assignments: c.assignments.filter((a) => a.subjectId !== id) })));
  };

  // ---- Step 3 handlers ----
  const addClass = () => setClasses((cs) => [...cs, { id: uid(), name: "", assignments: [] }]);
  const updateClass = (id: string, patch: Partial<ClassRoom>) =>
    setClasses((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeClass = (id: string) => setClasses((cs) => cs.filter((c) => c.id !== id));
  const toggleClassSubject = (cid: string, sid: string) => {
    setClasses((cs) => cs.map((c) => {
      if (c.id !== cid) return c;
      const has = c.assignments.find((a) => a.subjectId === sid);
      if (has) return { ...c, assignments: c.assignments.filter((a) => a.subjectId !== sid) };
      const sub = subjects.find((s) => s.id === sid);
      return { ...c, assignments: [...c.assignments, { subjectId: sid, teacher: sub?.teachers[0] ?? "" }] };
    }));
  };
  const setClassTeacher = (cid: string, sid: string, teacher: string) =>
    setClasses((cs) => cs.map((c) => c.id !== cid ? c : { ...c, assignments: c.assignments.map((a) => a.subjectId === sid ? { ...a, teacher } : a) }));

  // ---- Exports ----
  const currentClass = useMemo(() => classes.find((c) => c.id === activeClass), [classes, activeClass]);

  const buildTableData = (cls: ClassRoom): (string[])[] => {
    const grid = grids?.[cls.id];
    const headers = [t.period, ...t.days.slice(0, school.days)];
    const rows: string[][] = [headers];
    for (let p = 0; p < school.periods; p++) {
      const row: string[] = [`${p + 1}`];
      if (school.breaks.includes(p)) {
        for (let d = 0; d < school.days; d++) row.push(t.breakLabel);
      } else {
        for (let d = 0; d < school.days; d++) {
          const cell = grid?.[p][d];
          row.push(cell ? `${cell.subject}\n${cell.teacher}` : "");
        }
      }
      rows.push(row);
    }
    return rows;
  };

  const doPrint = () => window.print();

  const exportPdf = async (allClasses = false) => {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
    const jsPDF = (window as any).jspdf.jsPDF;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    const list = allClasses ? classes : currentClass ? [currentClass] : [];
    list.forEach((cls, idx) => {
      if (idx > 0) doc.addPage();
      const pageW = doc.internal.pageSize.getWidth();
      let y = 30;
      // header
      if (school.logo) {
        try { doc.addImage(school.logo, "PNG", isRTL ? pageW - 80 : 30, 20, 50, 50); } catch {}
      }
      if (school.stamp) {
        try { doc.addImage(school.stamp, "PNG", isRTL ? 30 : pageW - 80, 20, 50, 50); } catch {}
      }
      doc.setFontSize(14);
      doc.text(school.name, pageW / 2, y + 5, { align: "center" });
      doc.setFontSize(10);
      if (school.address) doc.text(school.address, pageW / 2, y + 22, { align: "center" });
      doc.text(`${school.year} — ${t.tabClass}: ${cls.name}`, pageW / 2, y + 38, { align: "center" });

      const data = buildTableData(cls);
      (doc as any).autoTable({
        startY: 90,
        head: [data[0]],
        body: data.slice(1),
        styles: { halign: "center", valign: "middle", fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [37, 99, 235] },
        theme: "grid",
      });
    });
    const fname = allClasses ? `timetable-all-${school.year || "schedule"}.pdf` : `timetable-${currentClass?.name || "class"}.pdf`;
    doc.save(fname);
  };

  const exportExcel = async () => {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    const XLSX = (window as any).XLSX;
    const wb = XLSX.utils.book_new();
    for (const cls of classes) {
      const data = buildTableData(cls);
      const aoa: any[][] = [
        [school.name],
        [school.address || ""],
        [`${school.year} — ${t.tabClass}: ${cls.name}`],
        [],
        ...data,
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      if (isRTL) (ws["!views"] = [{ RTL: true }]);
      XLSX.utils.book_append_sheet(wb, ws, cls.name.slice(0, 28) || "Class");
    }
    XLSX.writeFile(wb, `timetable-${school.year || "schedule"}.xlsx`);
  };

  // ---- UI ----

  const cardCls = "rounded-2xl border border-border bg-card/50 p-5";

  return (
    <ToolPageShell title={t.toolTitle} description={t.toolDesc}>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #timetable-print, #timetable-print * { visibility: visible !important; }
          #timetable-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; color: #000; }
          #timetable-print table { border-collapse: collapse; width: 100%; }
          #timetable-print th, #timetable-print td { border: 1px solid #444; padding: 6px; font-size: 11px; }
        }
      `}</style>

      <div dir={isRTL ? "rtl" : "ltr"} className="space-y-6">
        {/* Language selector */}
        <div className={`flex flex-wrap items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className={`relative ${isRTL ? "mr-auto" : "ml-auto"}`}>
            <Button variant="outline" size="sm" onClick={() => setLangOpen((o) => !o)} className="gap-2">
              <Globe2 className="w-4 h-4" />
              <span>{LANGUAGES.find((l) => l.code === lang)?.flag} {LANGUAGES.find((l) => l.code === lang)?.name}</span>
            </Button>
            {langOpen && (
              <div className={`absolute z-20 mt-2 ${isRTL ? "left-0" : "right-0"} w-48 rounded-xl border border-border bg-popover shadow-lg p-1`}>
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-secondary ${l.code === lang ? "bg-secondary" : ""}`}
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                  >
                    <span>{l.flag}</span>
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
            {stepLabels.map((label, i) => (
              <div key={i} className={`flex items-center gap-2 ${i === step ? "text-foreground font-semibold" : ""}`}>
                <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${i <= step ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
                {i < stepLabels.length - 1 && <span className="opacity-40">{isRTL ? "←" : "→"}</span>}
              </div>
            ))}
          </div>
          <Progress value={progress} />
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className={`${cardCls} space-y-4`}>
                <h2 className="font-display text-xl font-semibold">{t.step1}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t.schoolName}>
                    <Input value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} placeholder={t.schoolNamePh} />
                  </Field>
                  <Field label={t.academicYear}>
                    <Input value={school.year} onChange={(e) => setSchool({ ...school, year: e.target.value })} placeholder={t.academicYearPh} />
                  </Field>
                  <Field label={t.address} className="sm:col-span-2">
                    <Input value={school.address} onChange={(e) => setSchool({ ...school, address: e.target.value })} placeholder={t.addressPh} />
                  </Field>

                  <Field label={t.logo}>
                    <div className="flex items-center gap-3">
                      <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0] ?? null, "logo")} />
                      <Button type="button" variant="outline" size="sm" onClick={() => logoInput.current?.click()} className="gap-2">
                        <Upload className="w-4 h-4" /> {t.uploadHint}
                      </Button>
                      {school.logo && <img src={school.logo} alt="logo" className="w-12 h-12 object-contain rounded border border-border" />}
                    </div>
                  </Field>
                  <Field label={t.stamp}>
                    <div className="flex items-center gap-3">
                      <input ref={stampInput} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0] ?? null, "stamp")} />
                      <Button type="button" variant="outline" size="sm" onClick={() => stampInput.current?.click()} className="gap-2">
                        <Upload className="w-4 h-4" /> {t.uploadHint}
                      </Button>
                      {school.stamp && <img src={school.stamp} alt="stamp" className="w-12 h-12 object-contain rounded border border-border" />}
                    </div>
                  </Field>

                  <Field label={t.daysPerWeek}>
                    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={school.days} onChange={(e) => setSchool({ ...school, days: Number(e.target.value) })}>
                      <option value={5}>5</option><option value={6}>6</option>
                    </select>
                  </Field>
                  <Field label={t.periodsPerDay}>
                    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={school.periods} onChange={(e) => setSchool({ ...school, periods: Number(e.target.value), breaks: school.breaks.filter((b) => b < Number(e.target.value)) })}>
                      {[5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>
                  <Field label={`${t.periodDuration} (${t.minutes})`}>
                    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={school.duration} onChange={(e) => setSchool({ ...school, duration: Number(e.target.value) })}>
                      <option value={30}>30</option><option value={45}>45</option><option value={60}>60</option>
                    </select>
                  </Field>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">{t.breakPeriods}</p>
                  <p className="text-xs text-muted-foreground mb-3">{t.breakPeriodsHint}</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: school.periods }, (_, i) => (
                      <label key={i} className={`px-3 py-1.5 rounded-md border text-sm cursor-pointer ${school.breaks.includes(i) ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}>
                        <input type="checkbox" className="sr-only" checked={school.breaks.includes(i)} onChange={() => toggleBreak(i)} />
                        {t.period} {i + 1}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className={`${cardCls} space-y-4`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold">{t.step2}</h2>
                  <Button onClick={addSubject} size="sm" className="gap-2"><Plus className="w-4 h-4" />{t.addSubject}</Button>
                </div>
                <div className="space-y-3">
                  {subjects.map((s) => (
                    <div key={s.id} className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
                      <div className="grid sm:grid-cols-12 gap-3 items-end">
                        <Field label={t.subjectName} className="sm:col-span-5">
                          <Input value={s.name} onChange={(e) => updateSubject(s.id, { name: e.target.value })} placeholder="Math, English…" />
                        </Field>
                        <Field label={t.subjectColor} className="sm:col-span-2">
                          <input type="color" value={s.color} onChange={(e) => updateSubject(s.id, { color: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent" />
                        </Field>
                        <Field label={t.sessionsPerWeek} className="sm:col-span-3">
                          <Input type="number" min={1} max={20} value={s.sessions} onChange={(e) => updateSubject(s.id, { sessions: Math.max(1, Number(e.target.value) || 1) })} />
                        </Field>
                        <div className="sm:col-span-2 flex justify-end">
                          <Button variant="ghost" size="sm" onClick={() => removeSubject(s.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-2">{t.teachers}</p>
                        <div className="space-y-2">
                          {s.teachers.map((tch, i) => (
                            <div key={i} className="flex gap-2">
                              <Input value={tch} placeholder={t.teacherName} onChange={(e) => {
                                const arr = s.teachers.slice(); arr[i] = e.target.value;
                                updateSubject(s.id, { teachers: arr });
                              }} />
                              {s.teachers.length > 1 && (
                                <Button variant="ghost" size="sm" onClick={() => updateSubject(s.id, { teachers: s.teachers.filter((_, j) => j !== i) })}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => updateSubject(s.id, { teachers: [...s.teachers, ""] })} className="gap-2">
                            <Plus className="w-4 h-4" /> {t.addTeacher}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {subjects.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={`${cardCls} space-y-4`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold">{t.step3}</h2>
                  <Button onClick={addClass} size="sm" className="gap-2"><Plus className="w-4 h-4" />{t.addClass}</Button>
                </div>
                <div className="space-y-3">
                  {classes.map((c) => (
                    <div key={c.id} className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
                      <div className="flex gap-3 items-end">
                        <Field label={t.className} className="flex-1">
                          <Input value={c.name} onChange={(e) => updateClass(c.id, { name: e.target.value })} placeholder="Grade 6A, 3ème B…" />
                        </Field>
                        <Button variant="ghost" size="sm" onClick={() => removeClass(c.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-2">{t.selectSubjects}</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {subjects.map((s) => {
                            const assignment = c.assignments.find((a) => a.subjectId === s.id);
                            return (
                              <div key={s.id} className="flex items-center gap-2 p-2 rounded border border-border bg-card/40">
                                <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
                                  <input type="checkbox" checked={!!assignment} onChange={() => toggleClassSubject(c.id, s.id)} />
                                  <span className="w-3 h-3 rounded" style={{ background: s.color }} />
                                  <span>{s.name || "—"}</span>
                                </label>
                                {assignment && s.teachers.length > 0 && (
                                  <select
                                    value={assignment.teacher}
                                    onChange={(e) => setClassTeacher(c.id, s.id, e.target.value)}
                                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                                  >
                                    {s.teachers.filter((x) => x.trim()).map((tn) => <option key={tn} value={tn}>{tn}</option>)}
                                  </select>
                                )}
                              </div>
                            );
                          })}
                          {subjects.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {classes.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
                </div>

                {classes.length > 0 && subjects.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold mb-2">{t.classSummary}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border border-border">
                        <thead className="bg-secondary/40">
                          <tr>
                            <th className="text-start p-2 border-b border-border">{t.tabClass}</th>
                            <th className="text-start p-2 border-b border-border">{t.subject}</th>
                            <th className="text-start p-2 border-b border-border">{t.teacher}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classes.flatMap((c) => c.assignments.map((a) => {
                            const s = subjects.find((x) => x.id === a.subjectId);
                            return (
                              <tr key={c.id + a.subjectId} className="border-b border-border/60">
                                <td className="p-2">{c.name || "—"}</td>
                                <td className="p-2"><span className="inline-block w-2 h-2 rounded-full me-2" style={{ background: s?.color }} />{s?.name}</td>
                                <td className="p-2">{a.teacher}</td>
                              </tr>
                            );
                          }))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className={`${cardCls} space-y-4 text-center`}>
                <h2 className="font-display text-xl font-semibold">{t.step4}</h2>
                <p className="text-sm text-muted-foreground">{school.name} — {school.year}</p>
                <Button size="lg" onClick={doGenerate} disabled={generating} className="gap-2">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {generating ? t.generating : t.generate}
                </Button>
              </div>
            )}

            {step === 4 && grids && (
              <div className="space-y-4">
                {warning && (
                  <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm flex items-center gap-2" style={{ color: "var(--orange-brand)" }}>
                    <AlertTriangle className="w-4 h-4" /> {warning}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveClass(c.id)}
                      className={`px-3 py-1.5 rounded-md text-sm border ${activeClass === c.id ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                {currentClass && (
                  <div id="timetable-print" className="rounded-2xl border border-border bg-card/50 p-5">
                    {/* Header */}
                    <div className={`flex items-center justify-between gap-4 pb-4 mb-4 border-b border-border ${isRTL ? "flex-row-reverse" : ""}`}>
                      {school.logo ? <img src={school.logo} alt="" className="w-16 h-16 object-contain" /> : <div className="w-16" />}
                      <div className="text-center flex-1">
                        <h3 className="font-display text-xl font-bold">{school.name}</h3>
                        {school.address && <p className="text-sm text-muted-foreground">{school.address}</p>}
                        <p className="text-sm">{school.year} — {t.tabClass}: <strong>{currentClass.name}</strong></p>
                      </div>
                      {school.stamp ? <img src={school.stamp} alt="" className="w-16 h-16 object-contain" /> : <div className="w-16" />}
                    </div>

                    {/* Grid */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr>
                            <th className="border border-border bg-secondary/40 p-2">{t.period}</th>
                            {Array.from({ length: school.days }, (_, d) => (
                              <th key={d} className="border border-border bg-secondary/40 p-2">{t.days[d]}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: school.periods }, (_, p) => (
                            <tr key={p}>
                              <td className="border border-border bg-secondary/30 p-2 text-center font-medium">{p + 1}</td>
                              {school.breaks.includes(p)
                                ? Array.from({ length: school.days }, (_, d) => (
                                    <td key={d} className="border border-border p-2 text-center italic text-muted-foreground bg-muted/30">{t.breakLabel}</td>
                                  ))
                                : Array.from({ length: school.days }, (_, d) => {
                                    const cell = grids[currentClass.id]?.[p][d];
                                    return (
                                      <td key={d} className="border border-border p-2 text-center align-middle" style={cell ? { background: cell.color + "33" } : {}}>
                                        {cell ? (
                                          <div>
                                            <div className="font-semibold" style={{ color: cell.color }}>{cell.subject}</div>
                                            <div className="text-xs text-muted-foreground">{cell.teacher}</div>
                                          </div>
                                        ) : null}
                                      </td>
                                    );
                                  })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={doPrint} variant="outline" className="gap-2"><Printer className="w-4 h-4" />{t.print}</Button>
                  <Button onClick={() => exportPdf(false)} variant="outline" className="gap-2"><FileDown className="w-4 h-4" />{t.pdf}</Button>
                  <Button onClick={exportExcel} variant="outline" className="gap-2"><FileSpreadsheet className="w-4 h-4" />{t.excel}</Button>
                  <Button onClick={() => exportPdf(true)} variant="outline" className="gap-2"><Files className="w-4 h-4" />{t.pdfAll}</Button>
                  <Button onClick={doGenerate} className="gap-2 ms-auto">{t.regenerate}</Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < 4 && (
          <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
            <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="gap-2">
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {t.back}
            </Button>
            {step < 3 ? (
              <Button onClick={validateAndNext} className="gap-2">
                {t.next}
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            ) : (
              <Button onClick={doGenerate} disabled={generating} className="gap-2">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t.generate}
              </Button>
            )}
          </div>
        )}
      </div>

      <HowToUse
        steps={[
          "Pick your language and fill in school details — name, year, logo, periods and breaks.",
          "Add your subjects with colors and teachers, then create classes and pick which subjects each class takes.",
          "Click Generate to build a conflict-aware timetable, then print, export to PDF or Excel.",
        ]}
      />

      <ToolSeoContent
        title="Free School Timetable Generator — Multilingual, Browser-Based, No Signup"
        description="Build complete school timetables in 10 languages (including full Arabic RTL), with logos, classes, teachers, and one-click PDF, Excel, or print export — all in your browser."
        body={[
          "Our free School Timetable Generator helps teachers, principals, and school administrators build clean, conflict-aware weekly schedules in minutes. Configure your days per week, periods per day, break times, subjects, teachers, and classes through a guided 4-step wizard — then generate a timetable that automatically avoids placing the same teacher in two classes at the same time.",
          "Everything runs 100% in your browser. No accounts, no uploads, no servers — your school data, logo, and official stamp never leave your device. The interface is fully translated into English, French, Arabic, Spanish, Portuguese, German, Turkish, Indonesian, Swahili, and Russian, with complete right-to-left mirroring when Arabic is selected.",
          "Once your timetable is ready, switch between classes using tabs, then print directly or export to PDF (per class or all classes in one file) and Excel (one sheet per class). The school header — logo, name, address, academic year, and official stamp — is included on every exported page for a professional, ready-to-distribute result.",
        ]}
        faqs={[
          {
            question: "Is my school data uploaded anywhere?",
            answer:
              "No. Every step — uploads, generation, export — runs locally in your browser. We never receive your school name, logo, classes, teachers, or generated timetable.",
          },
          {
            question: "How does the conflict avoidance work?",
            answer:
              "When generating, the algorithm makes sure no teacher is assigned to two different classes in the same period on the same day. Break periods are locked and never filled. If conflicts can't be fully resolved, a warning is shown so you can adjust teachers or session counts.",
          },
          {
            question: "Can I use this for Arabic or right-to-left schools?",
            answer:
              "Yes. Select Arabic from the language menu and the entire interface — including the timetable grid, wizard steps, and exported PDF/Excel files — flips to right-to-left layout.",
          },
          {
            question: "What export formats are supported?",
            answer:
              "You can print directly, export the current class as a PDF, export every class together in a single multi-page PDF, or export an Excel workbook with one sheet per class. All exports include your school header with logo, name, year, and stamp.",
          },
        ]}
      />

      <RelatedTools currentSlug="timetable-generator" />
    </ToolPageShell>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}
