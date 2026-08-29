import type { Analysis, Book } from "./types";

export const demoText = `Longtemps, je me suis couché de bonne heure. Parfois, à peine ma bougie éteinte, mes yeux se fermaient si vite que je n'avais pas le temps de me dire : « Je m'endors. » Et, une demi-heure après, la pensée qu'il était temps de chercher le sommeil m'éveillait ; je voulais poser le volume que je croyais avoir encore dans les mains et souffler ma lumière.

Je n'avais pas cessé en dormant de faire des réflexions sur ce que je venais de lire, mais ces réflexions avaient pris un tour un peu particulier ; il me semblait que j'étais moi-même ce dont parlait l'ouvrage : une église, un quatuor, la rivalité de François Ier et de Charles Quint.

Cette croyance survivait pendant quelques secondes à mon réveil ; elle ne choquait pas ma raison, mais pesait comme des écailles sur mes yeux et les empêchait de se rendre compte que le bougeoir n'était plus allumé.

Puis elle commençait à me devenir inintelligible, comme après la métempsycose les pensées d'une existence antérieure ; le sujet du livre se détachait de moi, j'étais libre de m'y appliquer ou non ; aussitôt je recouvrais la vue et j'étais bien étonné de trouver autour de moi une obscurité, douce et reposante pour mes yeux, mais peut-être plus encore pour mon esprit, à qui elle apparaissait comme une chose sans cause, incompréhensible, comme une chose vraiment obscure.`;

export const demoBook: Book = {
  id: "demo-proust",
  title: "Marcel Proust — Du côté de chez Swann (фрагмент)",
  language: "fr",
  content: demoText,
  createdAt: Date.now(),
  progress: 0,
};

function base(selection: string, sentence: string): Analysis {
  return {
    selection,
    sentence,
    language: "fr",
    source: "demo",
    translationLiteral: "",
    translationContextual: "",
    lemma: "",
    partOfSpeech: "",
    morphology: "",
    grammar: "",
    meaning: "",
    nuances: "",
    synonyms: [],
    etymology: "",
    context: "",
    examples: [],
  };
}

const S1 = "Longtemps, je me suis couché de bonne heure.";

export const demoAnalyses: Record<string, Analysis> = {
  longtemps: {
    ...base("Longtemps", S1),
    translationLiteral: "«долгое время», «долго».",
    translationContextual:
      "«Долгие годы я ложился спать рано». В этой позиции слово задаёт итеративность: не один эпизод, а привычка, растянутая на годы.",
    lemma: "longtemps",
    partOfSpeech: "наречие времени",
    morphology:
      "Неизменяемое наречие, образованное сращением long + temps. Не имеет степеней сравнения в обычном употреблении (сравнительная передаётся как plus longtemps).",
    grammar:
      "Вынесено в абсолютное начало фразы и отделено запятой — маркированная тематизация (mise en relief). Синтаксически это сирконстант времени при сказуемом «me suis couché»; фронтальная позиция превращает его в тему всего романа.",
    meaning:
      "Здесь — «на протяжении длительного периода в прошлом», без точных границ. Слово намеренно неопределённо: читатель не знает ни начала, ни конца этого времени.",
    nuances:
      "В отличие от «pendant des années», «longtemps» субъективно: это длительность, пережитая изнутри, а не измеренная.",
    synonyms: [
      { word: "durant des années", difference: "объективная, исчислимая длительность." },
      { word: "jadis", difference: "отсылает к далёкому прошлому как эпохе, а не к длительности." },
      { word: "des lustres", difference: "разговорно-гиперболическое, с оттенком иронии." },
    ],
    etymology:
      "От старофранцузского «lonc tens» (XI в.), из латинского longum tempus. Сращение в одно слово закрепляется к XVI в. (уверенность высокая).",
    context:
      "Самое известное начало французского романа XX века. Открывающее «Longtemps» вводит главную тему «Поисков утраченного времени» — время как субстанция опыта; последнее слово романа — «Temps».",
    examples: [
      { text: "Il a longtemps hésité avant de répondre.", translation: "Он долго колебался, прежде чем ответить." },
      { text: "Cela fait longtemps que je ne l'ai pas vu.", translation: "Я давно его не видел." },
    ],
  },
  "je me suis couché": {
    ...base("je me suis couché", S1),
    translationLiteral: "«я себя уложил» → «я лёг».",
    translationContextual: "«я ложился (спать)» — регулярное, повторяющееся действие в прошлом.",
    lemma: "se coucher",
    partOfSpeech: "возвратный глагол, passé composé, 1 л. ед. ч.",
    morphology:
      "se coucher, вспомогательный être (как все местоименные глаголы), причастие «couché» согласуется с прямым дополнением-местоимением «me» → couché (м. р. ед. ч.).",
    grammar:
      "Passé composé обычно обозначает завершённое единичное действие, но в сочетании с «Longtemps» получает итеративное прочтение. Выбор passé composé вместо imparfait («je me couchais») — сознательный сдвиг: привычка подана как одно свершившееся целое.",
    meaning:
      "«Отходить ко сну», а не просто «принять горизонтальное положение»: контекст «de bonne heure» задаёт бытовой ритуал вечера.",
    nuances:
      "«Se coucher» — про действие отхода ко сну; «dormir» — про состояние сна; «s'endormir» — про момент засыпания (и именно он появляется во второй фразе).",
    synonyms: [
      { word: "s'endormir", difference: "переход в сон, а не укладывание." },
      { word: "aller au lit", difference: "нейтрально-разговорно, без ритуальности." },
      { word: "gagner sa chambre", difference: "книжно, подчёркивает перемещение." },
    ],
    etymology:
      "Из латинского collocare «размещать, укладывать» (com- + locare «помещать»), через старофранцузское «colchier». Возвратная форма развивает значение «укладывать себя».",
    context:
      "Ритуал отхода ко сну — сюжетный центр «Комбре»: сцена ожидания материнского поцелуя вырастает именно из этой фразы.",
    examples: [
      { text: "Les enfants se couchent à huit heures.", translation: "Дети ложатся в восемь." },
      { text: "Je me suis couché tard hier soir.", translation: "Вчера я лёг поздно." },
    ],
  },
  bougie: {
    ...base("bougie", "Parfois, à peine ma bougie éteinte, mes yeux se fermaient si vite…"),
    translationLiteral: "«свеча».",
    translationContextual: "«едва я гасил свечу» — предмет вечернего чтения в постели.",
    lemma: "bougie",
    partOfSpeech: "существительное женского рода",
    morphology: "la bougie / les bougies; ж. р., ед. ч. Здесь с притяжательным «ma».",
    grammar:
      "Часть абсолютного причастного оборота «à peine ma bougie éteinte» — сокращённая конструкция без глагола-связки, эквивалент «dès que ma bougie fut éteinte». Книжный, сжатый синтаксис.",
    meaning: "Восковая свеча как источник света для чтения; метонимия самого акта чтения перед сном.",
    nuances:
      "«Bougie» — обиходное слово; «cierge» — церковная свеча; «chandelle» — сальная, более архаичная.",
    synonyms: [
      { word: "chandelle", difference: "старинная сальная свеча, часто в устойчивых оборотах." },
      { word: "cierge", difference: "литургическая, высокая свеча." },
      { word: "bougeoir", difference: "не свеча, а подсвечник — появляется ниже в тексте." },
    ],
    etymology:
      "От названия алжирского города Bougie (Беджая), откуда во Францию ввозили восковые свечи (XIV в.). Редкий случай топонима, ставшего бытовым словом (уверенность высокая).",
    context:
      "Свеча датирует сцену: конец XIX века, до электрификации спален; её угасание физически размывает границу между чтением и сном.",
    examples: [
      { text: "Il alluma une bougie.", translation: "Он зажёг свечу." },
      { text: "Souffler la bougie.", translation: "Задуть свечу." },
    ],
  },
  sommeil: {
    ...base("sommeil", "la pensée qu'il était temps de chercher le sommeil m'éveillait"),
    translationLiteral: "«сон» (как состояние).",
    translationContextual: "«мысль, что пора искать сна, будила меня».",
    lemma: "sommeil",
    partOfSpeech: "существительное мужского рода",
    morphology: "le sommeil, обычно без множественного числа в этом значении.",
    grammar:
      "Прямое дополнение при инфинитиве «chercher»; вся группа — подлежащное придаточное при «la pensée que…». Парадокс фразы построен синтаксически: подлежащее «la pensée» имеет сказуемое «m'éveillait».",
    meaning: "Состояние сна, а не сновидение (это «rêve») и не потребность спать (это «envie de dormir»).",
    nuances: "«Chercher le sommeil» — устойчиво: усилие уснуть, то есть бессонное усилие.",
    synonyms: [
      { word: "assoupissement", difference: "лёгкая дремота, поверхностное состояние." },
      { word: "somnolence", difference: "сонливость как симптом, а не сон." },
      { word: "repos", difference: "отдых вообще, необязательно сон." },
    ],
    etymology:
      "Из народнолатинского somniculus, уменьшительного от somnus «сон». Родственно рус. «сон» через индоевропейский корень *swep- (уверенность высокая).",
    context:
      "Тема пограничного состояния между сном и явью — методологический вход в роман: именно в полусне работает непроизвольная память.",
    examples: [
      { text: "Je tombe de sommeil.", translation: "Я падаю с ног от сна." },
      { text: "Un sommeil profond.", translation: "Глубокий сон." },
    ],
  },
  métempsycose: {
    ...base("métempsycose", "comme après la métempsycose les pensées d'une existence antérieure"),
    translationLiteral: "«метемпсихоз», переселение душ.",
    translationContextual: "«как после переселения душ — мысли прежнего существования».",
    lemma: "métempsycose",
    partOfSpeech: "существительное женского рода, книжное/терминологическое",
    morphology: "la métempsycose; редко во мн. ч. Вариант написания métempsychose.",
    grammar:
      "Внутри сравнительного оборота «comme après…», который вводит аналогию к состоянию пробуждения. Обстоятельство времени при эллиптическом предложении.",
    meaning:
      "Здесь не религиозная доктрина, а метафора: мысли предыдущего «я» (читающего) становятся непонятны новому, проснувшемуся «я».",
    nuances:
      "«Réincarnation» — обиходное и религиозное слово; «métempsycose» — учёное, античное, задаёт философский регистр.",
    synonyms: [
      { word: "réincarnation", difference: "обиходно-религиозный термин, шире по употреблению." },
      { word: "transmigration", difference: "подчёркивает перемещение души как процесс." },
      { word: "palingénésie", difference: "возрождение, скорее космологический термин." },
    ],
    etymology:
      "Из греческого μετεμψύχωσις: meta- «пере-» + em- «в» + psychē «душа». Во французском с XVI в. через латинскую учёную традицию (уверенность высокая).",
    context:
      "Отсылка к пифагорейско-платоновской традиции. Пруст использует философский термин для описания разрыва личной идентичности во сне — тема, соседствующая с Бергсоном, которого Пруст знал.",
    examples: [
      { text: "La doctrine de la métempsycose.", translation: "Учение о переселении душ." },
      { text: "Une sorte de métempsycose littéraire.", translation: "Своего рода литературный метемпсихоз." },
    ],
  },
};

export function findDemoAnalysis(selection: string, sentence: string): Analysis {
  const key = selection.trim().toLowerCase().replace(/[.,;:!?«»"'—]/g, "");
  const hit = demoAnalyses[key];
  if (hit) return { ...hit, sentence: sentence || hit.sentence };
  return {
    ...base(selection, sentence),
    source: "demo",
    translationLiteral: "Демонстрационный режим: реальный перевод не выполнялся.",
    translationContextual:
      "Для этого фрагмента нет заранее подготовленного разбора. Это заглушка демо-режима, а не результат работы модели.",
    lemma: "—",
    partOfSpeech: "—",
    morphology: "Морфологический разбор доступен только при подключённом AI.",
    grammar: "Синтаксический разбор доступен только при подключённом AI.",
    meaning: `Выбранный фрагмент: «${selection}».`,
    nuances: "—",
    synonyms: [],
    etymology: "—",
    context: "",
    examples: [],
  };
}

export const demoFollowUp =
  "Демо-режим: свободные вопросы обрабатываются только при подключённом AI. Ответ ниже не является результатом анализа модели.";
