(()=> {
const BASE={
  pay:"Contribute",organizer:"Organizer",payWithPayPal:"Contribute with PayPal",
  raised:"Raised",progress:"Progress",supporters:"Supporters",remaining:"Remaining",
  observatory:"Live observatory",observatoryTitle:"The collective effort, as data.",
  observatoryText:"No donor leaderboard. The dashboard follows movement, distribution and distance to the goal.",
  liveData:"Live data",netFund:"Net fund",mean:"Mean contribution",median:"Median contribution",
  range:"Contribution range",goalGap:"Goal gap",medianNeeded:"Median-size contributions to goal",
  evolution:"Evolution",cumulativeCurve:"Cumulative contribution curve",sequence:"Sequence",
  eventCurve:"Contribution-event curve",distribution:"Distribution",sizeDistribution:"Contribution-size distribution",
  movement:"Movement",dailyFlow:"Daily inflow and refunds",runway:"Runway",distanceToGoal:"Distance to goal",
  moneyFlow:"Money flow",raisedUsedAvailable:"Raised → used → available",milestones:"Milestones",
  collectiveProgress:"Collective progress",people:"Supporter registry",peopleNotRanked:"Identified, never ranked.",
  randomOrder:"Stable supporter IDs enable analysis and audits without exposing private identities.",
  reshuffle:"Reshuffle",transparency:"Transparency",moneyPosition:"Current money position",
  gross:"Gross",refunds:"Refunds",used:"Used",available:"Available",journal:"Journal",
  updates:"Updates",ledger:"Public ledger",expenses:"Disbursements",
  quote:"Solidarity means collectivizing the pain, the joy and the effort.",
  privacy:"Privacy by default",noCompetition:"No donor competition",auditable:"Corrections stay auditable",
  organizerRoom:"Organizer control room",anonymous:"Anonymous",events:"events",goal:"Goal",
  goalReached:"Goal reached",confirmed:"confirmed",refunded:"refunded",noData:"Not enough data yet.",
  first:"First",last:"Last",net:"Net"
};
const OVERRIDES={
fr:{
  pay:"Contribuer",organizer:"Organisateur",payWithPayPal:"Contribuer avec PayPal",raised:"Collecté",progress:"Progression",supporters:"Soutiens",remaining:"Restants",
  observatory:"Observatoire en direct",observatoryTitle:"L’effort collectif, en données.",observatoryText:"Pas de classement des donateurs. Le tableau suit le mouvement, la distribution et la distance à l’objectif.",
  liveData:"Données en direct",netFund:"Fonds net",mean:"Contribution moyenne",median:"Contribution médiane",range:"Étendue des contributions",goalGap:"Écart à l’objectif",medianNeeded:"Contributions médianes nécessaires",
  evolution:"Évolution",cumulativeCurve:"Courbe cumulative des contributions",sequence:"Séquence",eventCurve:"Courbe des événements",distribution:"Distribution",sizeDistribution:"Distribution des montants",
  movement:"Mouvement",dailyFlow:"Entrées et remboursements quotidiens",runway:"Distance",distanceToGoal:"Distance à l’objectif",moneyFlow:"Flux financier",raisedUsedAvailable:"Collecté → utilisé → disponible",
  milestones:"Étapes",collectiveProgress:"Progrès collectif",people:"Registre des soutiens",peopleNotRanked:"Identifiés, jamais classés.",randomOrder:"Des identifiants stables permettent l’analyse et l’audit sans révéler les identités privées.",
  reshuffle:"Mélanger",transparency:"Transparence",moneyPosition:"Situation actuelle du fonds",gross:"Brut",refunds:"Remboursements",used:"Utilisé",available:"Disponible",journal:"Journal",updates:"Actualités",
  ledger:"Registre public",expenses:"Décaissements",quote:"La solidarité, c’est collectiviser la peine, la joie et l’effort.",privacy:"Confidentialité par défaut",noCompetition:"Pas de compétition entre donateurs",
  auditable:"Les corrections restent vérifiables",organizerRoom:"Espace organisateur",anonymous:"Anonyme",events:"événements",goal:"Objectif",goalReached:"Objectif atteint",confirmed:"confirmé",refunded:"remboursé",noData:"Pas encore assez de données.",first:"Premier",last:"Dernier",net:"Net"
},
de:{
  pay:"Beitragen",organizer:"Organisation",payWithPayPal:"Mit PayPal beitragen",raised:"Gesammelt",progress:"Fortschritt",supporters:"Unterstützende",remaining:"Verbleibend",
  observatory:"Live-Datenlabor",observatoryTitle:"Die gemeinsame Anstrengung als Daten.",observatoryText:"Keine Spender-Rangliste. Das Dashboard zeigt Bewegung, Verteilung und Abstand zum Ziel.",
  liveData:"Live-Daten",netFund:"Nettofonds",mean:"Durchschnitt",median:"Median",range:"Beitragsspanne",goalGap:"Abstand zum Ziel",medianNeeded:"Medianbeiträge bis zum Ziel",
  evolution:"Entwicklung",cumulativeCurve:"Kumulative Beitragskurve",sequence:"Sequenz",eventCurve:"Kurve der Beitragsereignisse",distribution:"Verteilung",sizeDistribution:"Verteilung der Beitragshöhen",
  movement:"Bewegung",dailyFlow:"Tägliche Einzahlungen und Rückerstattungen",runway:"Zielstrecke",distanceToGoal:"Abstand zum Ziel",moneyFlow:"Geldfluss",raisedUsedAvailable:"Gesammelt → verwendet → verfügbar",
  milestones:"Meilensteine",collectiveProgress:"Gemeinsamer Fortschritt",people:"Unterstützerregister",peopleNotRanked:"Identifiziert, niemals gerankt.",randomOrder:"Stabile IDs ermöglichen Analyse und Audit ohne private Identitäten offenzulegen.",
  reshuffle:"Neu mischen",transparency:"Transparenz",moneyPosition:"Aktueller Stand",gross:"Brutto",refunds:"Rückerstattungen",used:"Verwendet",available:"Verfügbar",journal:"Journal",updates:"Updates",
  ledger:"Öffentliches Kassenbuch",expenses:"Auszahlungen",quote:"Solidarität heißt, Schmerz, Freude und Anstrengung gemeinsam zu tragen.",privacy:"Privatsphäre als Standard",noCompetition:"Kein Spendenwettbewerb",
  auditable:"Korrekturen bleiben nachvollziehbar",organizerRoom:"Organisationsbereich",anonymous:"Anonym",events:"Ereignisse",goal:"Ziel",goalReached:"Ziel erreicht",confirmed:"bestätigt",refunded:"erstattet",noData:"Noch nicht genügend Daten.",first:"Erster",last:"Letzter",net:"Netto"
},
es:{
  pay:"Contribuir",organizer:"Organización",payWithPayPal:"Contribuir con PayPal",raised:"Recaudado",progress:"Progreso",supporters:"Personas",remaining:"Restante",
  observatory:"Observatorio en vivo",observatoryTitle:"El esfuerzo colectivo, convertido en datos.",observatoryText:"Sin clasificación de donantes. El panel sigue el movimiento, la distribución y la distancia al objetivo.",
  liveData:"Datos en vivo",netFund:"Fondo neto",mean:"Contribución media",median:"Contribución mediana",range:"Rango de contribuciones",goalGap:"Distancia al objetivo",medianNeeded:"Contribuciones medianas hasta la meta",
  evolution:"Evolución",cumulativeCurve:"Curva acumulada",sequence:"Secuencia",eventCurve:"Curva de eventos",distribution:"Distribución",sizeDistribution:"Distribución de importes",
  movement:"Movimiento",dailyFlow:"Entradas y reembolsos diarios",runway:"Recorrido",distanceToGoal:"Distancia al objetivo",moneyFlow:"Flujo del fondo",raisedUsedAvailable:"Recaudado → usado → disponible",
  milestones:"Hitos",collectiveProgress:"Progreso colectivo",people:"Registro de apoyos",peopleNotRanked:"Identificados, nunca clasificados.",randomOrder:"IDs estables permiten análisis y auditoría sin revelar identidades privadas.",
  reshuffle:"Barajar",transparency:"Transparencia",moneyPosition:"Situación actual",gross:"Bruto",refunds:"Reembolsos",used:"Usado",available:"Disponible",journal:"Diario",updates:"Actualizaciones",
  ledger:"Registro público",expenses:"Desembolsos",quote:"La solidaridad significa colectivizar el dolor, la alegría y el esfuerzo.",privacy:"Privacidad por defecto",noCompetition:"Sin competencia entre donantes",
  auditable:"Las correcciones siguen siendo auditables",organizerRoom:"Panel de organización",anonymous:"Anónimo",events:"eventos",goal:"Objetivo",goalReached:"Objetivo alcanzado",confirmed:"confirmado",refunded:"reembolsado",noData:"Aún no hay suficientes datos.",first:"Primero",last:"Último",net:"Neto"
},
it:{
  pay:"Contribuisci",organizer:"Organizzazione",payWithPayPal:"Contribuisci con PayPal",raised:"Raccolto",progress:"Progresso",supporters:"Sostenitori",remaining:"Rimanente",
  observatory:"Osservatorio live",observatoryTitle:"Lo sforzo collettivo, nei dati.",observatoryText:"Nessuna classifica dei donatori. La dashboard segue movimento, distribuzione e distanza dall’obiettivo.",
  liveData:"Dati live",netFund:"Fondo netto",mean:"Contributo medio",median:"Contributo mediano",range:"Intervallo dei contributi",goalGap:"Distanza dall’obiettivo",medianNeeded:"Contributi mediani necessari",
  evolution:"Evoluzione",cumulativeCurve:"Curva cumulativa",sequence:"Sequenza",eventCurve:"Curva degli eventi",distribution:"Distribuzione",sizeDistribution:"Distribuzione degli importi",
  movement:"Movimento",dailyFlow:"Entrate e rimborsi giornalieri",runway:"Percorso",distanceToGoal:"Distanza dall’obiettivo",moneyFlow:"Flusso del fondo",raisedUsedAvailable:"Raccolto → usato → disponibile",
  milestones:"Traguardi",collectiveProgress:"Progresso collettivo",people:"Registro sostenitori",peopleNotRanked:"Identificati, mai classificati.",randomOrder:"ID stabili consentono analisi e audit senza esporre identità private.",
  reshuffle:"Rimescola",transparency:"Trasparenza",moneyPosition:"Posizione attuale",gross:"Lordo",refunds:"Rimborsi",used:"Usato",available:"Disponibile",journal:"Diario",updates:"Aggiornamenti",
  ledger:"Registro pubblico",expenses:"Erogazioni",quote:"La solidarietà significa collettivizzare il dolore, la gioia e lo sforzo.",privacy:"Privacy predefinita",noCompetition:"Nessuna competizione tra donatori",
  auditable:"Le correzioni restano verificabili",organizerRoom:"Pannello organizzatore",anonymous:"Anonimo",events:"eventi",goal:"Obiettivo",goalReached:"Obiettivo raggiunto",confirmed:"confermato",refunded:"rimborsato",noData:"Non ci sono ancora abbastanza dati.",first:"Primo",last:"Ultimo",net:"Netto"
},
pt:{
  pay:"Contribuir",organizer:"Organização",payWithPayPal:"Contribuir com PayPal",raised:"Arrecadado",progress:"Progresso",supporters:"Apoiadores",remaining:"Restante",
  observatory:"Observatório ao vivo",observatoryTitle:"O esforço coletivo, em dados.",observatoryText:"Sem ranking de doadores. O painel acompanha movimento, distribuição e distância até a meta.",
  liveData:"Dados ao vivo",netFund:"Fundo líquido",mean:"Contribuição média",median:"Contribuição mediana",range:"Faixa de contribuições",goalGap:"Distância até a meta",medianNeeded:"Contribuições medianas até a meta",
  evolution:"Evolução",cumulativeCurve:"Curva acumulada",sequence:"Sequência",eventCurve:"Curva de eventos",distribution:"Distribuição",sizeDistribution:"Distribuição dos valores",
  movement:"Movimento",dailyFlow:"Entradas e reembolsos diários",runway:"Percurso",distanceToGoal:"Distância até a meta",moneyFlow:"Fluxo do fundo",raisedUsedAvailable:"Arrecadado → usado → disponível",
  milestones:"Marcos",collectiveProgress:"Progresso coletivo",people:"Registro de apoiadores",peopleNotRanked:"Identificados, nunca classificados.",randomOrder:"IDs estáveis permitem análise e auditoria sem expor identidades privadas.",
  reshuffle:"Embaralhar",transparency:"Transparência",moneyPosition:"Situação atual",gross:"Bruto",refunds:"Reembolsos",used:"Usado",available:"Disponível",journal:"Diário",updates:"Atualizações",
  ledger:"Registro público",expenses:"Desembolsos",quote:"Solidariedade significa coletivizar a dor, a alegria e o esforço.",privacy:"Privacidade por padrão",noCompetition:"Sem competição entre doadores",
  auditable:"Correções permanecem auditáveis",organizerRoom:"Painel da organização",anonymous:"Anônimo",events:"eventos",goal:"Meta",goalReached:"Meta alcançada",confirmed:"confirmado",refunded:"reembolsado",noData:"Ainda não há dados suficientes.",first:"Primeiro",last:"Último",net:"Líquido"
},
nl:{
  pay:"Bijdragen",organizer:"Organisatie",payWithPayPal:"Bijdragen via PayPal",raised:"Ingezameld",progress:"Voortgang",supporters:"Steunbetuigers",remaining:"Resterend",
  observatory:"Live observatorium",observatoryTitle:"De gezamenlijke inspanning, als data.",observatoryText:"Geen donorranglijst. Het dashboard volgt beweging, verdeling en afstand tot het doel.",
  liveData:"Live data",netFund:"Netto fonds",mean:"Gemiddelde bijdrage",median:"Mediane bijdrage",range:"Bereik bijdragen",goalGap:"Afstand tot doel",medianNeeded:"Mediane bijdragen tot doel",
  evolution:"Evolutie",cumulativeCurve:"Cumulatieve bijdragecurve",sequence:"Volgorde",eventCurve:"Curve per bijdrage",distribution:"Verdeling",sizeDistribution:"Verdeling van bijdragebedragen",
  movement:"Beweging",dailyFlow:"Dagelijkse instroom en terugbetalingen",runway:"Traject",distanceToGoal:"Afstand tot doel",moneyFlow:"Geldstroom",raisedUsedAvailable:"Ingezameld → gebruikt → beschikbaar",
  milestones:"Mijlpalen",collectiveProgress:"Collectieve vooruitgang",people:"Supporterregister",peopleNotRanked:"Geïdentificeerd, nooit gerangschikt.",randomOrder:"Stabiele IDs maken analyse en audit mogelijk zonder privé-identiteiten te tonen.",
  reshuffle:"Opnieuw schudden",transparency:"Transparantie",moneyPosition:"Huidige fondspositie",gross:"Bruto",refunds:"Terugbetalingen",used:"Gebruikt",available:"Beschikbaar",journal:"Journaal",updates:"Updates",
  ledger:"Openbaar kasboek",expenses:"Uitbetalingen",quote:"Solidariteit betekent pijn, vreugde en inspanning collectiviseren.",privacy:"Privacy standaard",noCompetition:"Geen donorcompetitie",
  auditable:"Correcties blijven controleerbaar",organizerRoom:"Organisatiepaneel",anonymous:"Anoniem",events:"gebeurtenissen",goal:"Doel",goalReached:"Doel bereikt",confirmed:"bevestigd",refunded:"terugbetaald",noData:"Nog niet genoeg data.",first:"Eerste",last:"Laatste",net:"Netto"
},
ar:{
  pay:"ساهم",organizer:"المنظم",payWithPayPal:"المساهمة عبر PayPal",raised:"تم جمعه",progress:"التقدم",supporters:"الداعمون",remaining:"المتبقي",
  observatory:"مرصد مباشر",observatoryTitle:"الجهد الجماعي كما ترويه البيانات.",observatoryText:"لا ترتيب للمتبرعين. تتبع اللوحة الحركة والتوزيع والمسافة إلى الهدف.",
  liveData:"بيانات مباشرة",netFund:"الصندوق الصافي",mean:"متوسط المساهمة",median:"وسيط المساهمة",range:"نطاق المساهمات",goalGap:"الفجوة إلى الهدف",medianNeeded:"مساهمات وسيطة للوصول للهدف",
  evolution:"التطور",cumulativeCurve:"منحنى المساهمات التراكمي",sequence:"التسلسل",eventCurve:"منحنى أحداث المساهمة",distribution:"التوزيع",sizeDistribution:"توزيع أحجام المساهمات",
  movement:"الحركة",dailyFlow:"التدفق اليومي والاستردادات",runway:"المسار",distanceToGoal:"المسافة إلى الهدف",moneyFlow:"تدفق الأموال",raisedUsedAvailable:"تم جمعه ← مستخدم ← متاح",
  milestones:"المحطات",collectiveProgress:"التقدم الجماعي",people:"سجل الداعمين",peopleNotRanked:"معرّفون دون ترتيب.",randomOrder:"تتيح المعرّفات الثابتة التحليل والتدقيق دون كشف الهويات الخاصة.",
  reshuffle:"إعادة الخلط",transparency:"الشفافية",moneyPosition:"الوضع الحالي للصندوق",gross:"الإجمالي",refunds:"الاستردادات",used:"المستخدم",available:"المتاح",journal:"السجل",updates:"التحديثات",
  ledger:"السجل العام",expenses:"المصروفات",quote:"التضامن يعني أن نجعل الألم والفرح والجهد شأنًا جماعيًا.",privacy:"الخصوصية افتراضيًا",noCompetition:"لا منافسة بين المتبرعين",
  auditable:"تبقى التصحيحات قابلة للمراجعة",organizerRoom:"لوحة المنظم",anonymous:"مجهول",events:"أحداث",goal:"الهدف",goalReached:"تم بلوغ الهدف",confirmed:"مؤكد",refunded:"مسترد",noData:"لا توجد بيانات كافية بعد.",first:"الأول",last:"الأخير",net:"الصافي"
}};
window.SolidarityI18N={
  languages:{en:"English",fr:"Français",de:"Deutsch",es:"Español",it:"Italiano",pt:"Português",nl:"Nederlands",ar:"العربية"},
  rtl:new Set(["ar","fa","he","ur"]),
  get(locale,key){return (OVERRIDES[locale]||{})[key]||BASE[key]||key}
};
})();