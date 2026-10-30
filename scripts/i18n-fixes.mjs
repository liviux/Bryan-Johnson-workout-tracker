// Small grammar fixes for phrases the generator assembles at runtime.
export const fixes = {
  ro: { "Set {set}": "Seria {set}", "Set {set} of {sets}.": "Seria {set} din {sets}.", "Rest for": "Odihnă pentru", "and": "și", "using": "cu" },
  de: { "Set {set}": "Satz {set}", "Set {set} of {sets}.": "Satz {set} von {sets}.", "Rest for": "Pause für", "and": "und", "using": "mit", "Main": "Hauptnavigation", "workout tracker": "Trainings-Tracker", "Home Protocol · workout tracker": "Heimprotokoll · Trainings-Tracker" },
  it: { "Set {set}": "Serie {set}", "Set {set} of {sets}.": "Serie {set} di {sets}.", "Rest for": "Riposa per", "and": "e", "using": "con" },
  fr: { "Set {set}": "Série {set}", "Set {set} of {sets}.": "Série {set} sur {sets}.", "Rest for": "Repos de", "and": "et", "using": "avec" },
  es: { "Set {set}": "Serie {set}", "Set {set} of {sets}.": "Serie {set} de {sets}.", "Rest for": "Descansa", "and": "y", "using": "con" },
  zh: { "Set {set}": "第 {set} 组", "Set {set} of {sets}.": "第 {set} 组，共 {sets} 组。", "Rest for": "休息", "and": "和", "using": "使用", "{dir}/": "{dir}/", "{label}. {duration}. Breathe steadily throughout the hold.": "{label}。{duration}。在整个保持过程中保持平稳呼吸。" },
  hi: { "Set {set}": "सेट {set}", "Set {set} of {sets}.": "सेट {set} / {sets}।", "Rest for": "आराम करें", "and": "और", "using": "के साथ" },
  ar: { "Set {set}": "المجموعة {set}", "Set {set} of {sets}.": "المجموعة {set} من {sets}.", "Rest for": "استرح لمدة", "and": "و", "using": "باستخدام", "Main": "التنقل الرئيسي", "workout tracker": "متتبع التمارين", "Home Protocol · workout tracker": "بروتوكول المنزل · متتبع التمارين", "{sets} sets of {reps}{unit}": "{sets} مجموعات من {reps}{unit}", "Keep going: {count} more {sessions}{weeks} to the checkpoint. Tick the checks when they are true.": "استمر: {count} المزيد من {sessions}{weeks} حتى نقطة التحقق. ضع علامة على الفحوصات عندما تكون صحيحة.", "Videos ({count}{bryan})": "الفيديوهات ({count}{bryan})", "Your details and workouts save in the <code>{dir}/</code> folder on this computer.": "تُحفظ تفاصيلك وتمارينك في مجلد <code>{dir}/</code> على هذا الكمبيوتر." },
  bn: { "Set {set}": "সেট {set}", "Set {set} of {sets}.": "সেট {set} / {sets}।", "Rest for": "বিশ্রাম নিন", "and": "এবং", "using": "সহ" },
  fa: {
    "Switching language now shows the voice download button immediately. Turn coaching on is no longer greyed out; turning it on with an unsaved voice also starts the download.": "اکنون تغییر زبان دکمه دانلود صدا را بلافاصله نشان می‌دهد. گزینه «کوچینگ را روشن کنید» دیگر خاکستری نیست؛ روشن کردن آن با صدای ذخیره‌نشده نیز دانلود را شروع می‌کند.",
    "Changing language now shows the voice download button and its progress immediately, and Turn coaching off stays available while the download runs.": "تغییر زبان اکنون دکمه دانلود صدا و پیشرفت آن را فوراً نشان می‌دهد و گزینه «کوچینگ را خاموش کنید» تا زمانی که دانلود اجرا می‌شود در دسترس می‌ماند.",
    "When coaching is on, choosing a voice or language downloads that voice automatically. When coaching is off, use the Download local voice button, which shows clip progress while it copies.": "وقتی کوچینگ روشن است، انتخاب یک صدا یا زبان آن صدا را به صورت خودکار دانلود می‌کند. وقتی کوچینگ خاموش است، از دکمه «دانلود صدای محلی» استفاده کنید که پیشرفت کلیپ را هنگام کپی کردن نشان می‌دهد.",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "اکنون هر صدایی در «مربی صوتی» دکمه دانلود مخصوص به خود را دارد، شامل هر پنج صدای انگلیسی و هر زبان ترجمه‌شده. وقتی کوچینگ روشن است، انتخاب یک صدا همچنان دانلود آن را شروع می‌کند.",
  },
  el: {
    "Switching language now shows the voice download button immediately. Turn coaching on is no longer greyed out; turning it on with an unsaved voice also starts the download.": "Η αλλαγή γλώσσας εμφανίζει τώρα αμέσως το κουμπί λήψης φωνής. «Ενεργοποιήστε το coaching» δεν είναι πλέον γκριζαρισμένο· η ενεργοποίησή του με μη αποθηκευμένη φωνή ξεκινά επίσης τη λήψη.",
    "Changing language now shows the voice download button and its progress immediately, and Turn coaching off stays available while the download runs.": "Η αλλαγή γλώσσας εμφανίζει τώρα αμέσως το κουμπί λήψης φωνής και την πρόοδό του, και «Απενεργοποιήστε το coaching» παραμένει διαθέσιμο όσο εκτελείται η λήψη.",
    "When coaching is on, choosing a voice or language downloads that voice automatically. When coaching is off, use the Download local voice button, which shows clip progress while it copies.": "Όταν το coaching είναι ενεργοποιημένο, η επιλογή φωνής ή γλώσσας κατεβάζει αυτόματα αυτήν τη φωνή. Όταν το coaching είναι απενεργοποιημένο, χρησιμοποιήστε το κουμπί «Λήψη τοπικής φωνής», το οποίο δείχνει την πρόοδο των κλιπ κατά την αντιγραφή.",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Κάθε φωνή στον φωνητικό προπονητή έχει πλέον το δικό της κουμπί λήψης, συμπεριλαμβανομένων και των πέντε αγγλικών φωνών και κάθε μεταφρασμένης γλώσσας. Η επιλογή μιας φωνής εξακολουθεί να ξεκινά τη λήψη της όταν το coaching είναι ενεργοποιημένο.",
  },
  cs: {
    "Switching language now shows the voice download button immediately. Turn coaching on is no longer greyed out; turning it on with an unsaved voice also starts the download.": "Přepnutí jazyka nyní okamžitě zobrazí tlačítko stahování hlasu. Možnost „Zapněte koučování“ už není zašedlá; zapnutím s neuloženým hlasem se také spustí stahování.",
    "Changing language now shows the voice download button and its progress immediately, and Turn coaching off stays available while the download runs.": "Změna jazyka nyní okamžitě zobrazí tlačítko stahování hlasu i jeho průběh a možnost „Vypněte koučování“ zůstává dostupná po dobu stahování.",
    "When coaching is on, choosing a voice or language downloads that voice automatically. When coaching is off, use the Download local voice button, which shows clip progress while it copies.": "Když je koučování zapnuté, výběrem hlasu nebo jazyka se tento hlas automaticky stáhne. Když je koučování vypnuté, použijte tlačítko „Stáhněte si místní hlas“, které zobrazuje průběh klipů během kopírování.",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Každý hlas v hlasovém trenérovi má nyní vlastní tlačítko stahování, včetně všech pěti anglických hlasů a každého přeloženého jazyka. Výběr hlasu stále zahájí jeho stahování, když je koučování zapnuté.",
  },
  lt: {
    "Switching language now shows the voice download button immediately. Turn coaching on is no longer greyed out; turning it on with an unsaved voice also starts the download.": "Perjungus kalbą, dabar iš karto rodomas balso atsisiuntimo mygtukas. „Įjunkite instruktavimą“ nebe pilkas; jį įjungus su neišsaugotu balsu taip pat pradedamas atsisiuntimas.",
    "Changing language now shows the voice download button and its progress immediately, and Turn coaching off stays available while the download runs.": "Pakeitus kalbą dabar iš karto rodomas balso atsisiuntimo mygtukas ir jo eiga, o parinktis „Išjunkite instruktavimą“ lieka pasiekiama, kol vyksta atsisiuntimas.",
    "When coaching is on, choosing a voice or language downloads that voice automatically. When coaching is off, use the Download local voice button, which shows clip progress while it copies.": "Kai mokymas įjungtas, pasirinkus balsą arba kalbą, tas balsas atsisiunčiamas automatiškai. Kai mokymas išjungtas, naudokite mygtuką „Atsisiųsti vietinį balsą“, kuris rodo klipų eigą kopijuojant.",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Kiekvienas balso trenerio balsas dabar turi savo atsisiuntimo mygtuką, įskaitant visus penkis angliškus balsus ir kiekvieną išverstą kalbą. Pasirinkus balsą, jo atsisiuntimas vis tiek pradedamas, kai mokymas įjungtas.",
  },
  th: {
    "The language picker lists the languages with the widest reach on the internet first.": "ตัวเลือกภาษาจะแสดงรายการภาษาที่เข้าถึงได้กว้างที่สุดบนอินเทอร์เน็ตก่อน",
    "Switching language now shows the voice download button immediately. Turn coaching on is no longer greyed out; turning it on with an unsaved voice also starts the download.": "การสลับภาษาจะแสดงปุ่มดาวน์โหลดเสียงทันที «เปิดการฝึกสอน» ไม่เป็นสีเทาอีกต่อไป การเปิดด้วยเสียงที่ยังไม่ได้บันทึกก็เริ่มดาวน์โหลดด้วย",
    "Changing language now shows the voice download button and its progress immediately, and Turn coaching off stays available while the download runs.": "การเปลี่ยนภาษาจะแสดงปุ่มดาวน์โหลดเสียงและความคืบหน้าทันที และ «ปิดการฝึกสอน» ยังคงใช้งานได้ในระหว่างการดาวน์โหลด",
    "When coaching is on, choosing a voice or language downloads that voice automatically. When coaching is off, use the Download local voice button, which shows clip progress while it copies.": "เมื่อเปิดการฝึกสอน การเลือกเสียงหรือภาษาจะดาวน์โหลดเสียงนั้นโดยอัตโนมัติ เมื่อปิดการฝึกสอน ให้ใช้ปุ่ม «ดาวน์โหลดเสียงท้องถิ่น» ซึ่งจะแสดงความคืบหน้าของคลิประหว่างการคัดลอก",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "ตอนนี้ทุกเสียงในโค้ชเสียงมีปุ่มดาวน์โหลดของตัวเอง รวมถึงเสียงภาษาอังกฤษทั้งห้าเสียงและแต่ละภาษาที่แปลแล้ว การเลือกเสียงจะยังคงเริ่มดาวน์โหลดเมื่อเปิดการฝึกสอน",
  },
  sw: {
    "Switching language now shows the voice download button immediately. Turn coaching on is no longer greyed out; turning it on with an unsaved voice also starts the download.": "Kubadilisha lugha sasa kunaonyesha kitufe cha kupakua sauti mara moja. «Washa kufundisha» hakijafifishwa tena; kukiwasha kwa sauti isiyohifadhiwa pia huanza upakuaji.",
    "Changing language now shows the voice download button and its progress immediately, and Turn coaching off stays available while the download runs.": "Kubadilisha lugha sasa kunaonyesha kitufe cha kupakua sauti na maendeleo yake mara moja, na «Zima kufundisha» kinabaki kupatikana wakati upakuaji unaendelea.",
    "When coaching is on, choosing a voice or language downloads that voice automatically. When coaching is off, use the Download local voice button, which shows clip progress while it copies.": "Wakati ufundishaji umewashwa, kuchagua sauti au lugha hupakua sauti hiyo kiotomatiki. Wakati ufundishaji umezimwa, tumia kitufe cha «Pakua sauti ya ndani», ambacho kinaonyesha maendeleo ya klipu wakati inakili.",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Kila sauti katika mkufunzi wa sauti sasa ina kitufe chake cha kupakua, ikiwa ni pamoja na sauti zote tano za Kiingereza na kila lugha iliyotafsiriwa. Kuchagua sauti bado kunaanza upakuaji wake wakati ufundishaji umewashwa.",
  },
  ka: {
    "Switching language now shows the voice download button immediately. Turn coaching on is no longer greyed out; turning it on with an unsaved voice also starts the download.": "ენის შეცვლა ახლა დაუყოვნებლივ აჩვენებს ხმის ჩამოტვირთვის ღილაკს. „ჩართეთ ქოუჩინგი“ აღარ არის ნაცრისფერი; მისი ჩართვა უშენახავი ხმითაც იწყებს ჩამოტვირთვას.",
    "Changing language now shows the voice download button and its progress immediately, and Turn coaching off stays available while the download runs.": "ენის შეცვლა ახლა დაუყოვნებლივ აჩვენებს ხმის ჩამოტვირთვის ღილაკს და მის პროგრესს, ხოლო „გამორთეთ ქოუჩინგი“ ხელმისაწვდომი რჩება ჩამოტვირთვის დროს.",
    "When coaching is on, choosing a voice or language downloads that voice automatically. When coaching is off, use the Download local voice button, which shows clip progress while it copies.": "როდესაც ქოუჩინგი ჩართულია, ხმის ან ენის არჩევა ამ ხმას ავტომატურად ჩამოტვირთავს. როდესაც ქოუჩინგი გამორთულია, გამოიყენეთ ღილაკი „ადგილობრივი ხმის ჩამოტვირთვა“, რომელიც აჩვენებს კლიპების პროგრესს კოპირების დროს.",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "ხმოვანი მწვრთნელის თითოეულ ხმას ახლა აქვს საკუთარი ჩამოტვირთვის ღილაკი, მათ შორის ხუთივე ინგლისური ხმა და თითოეული ნათარგმნი ენა. ხმის არჩევა კვლავ იწყებს მის ჩამოტვირთვას, როცა ქოუჩინგი ჩართულია.",
  },
  he: {
    "Switching language now shows the voice download button immediately. Turn coaching on is no longer greyed out; turning it on with an unsaved voice also starts the download.": "החלפת שפה מציגה כעת מיד את כפתור ההורדה הקולית. «הפעל את האימון» אינו אפור עוד; הפעלתו בקול שלא נשמר מתחילה גם את ההורדה.",
    "Changing language now shows the voice download button and its progress immediately, and Turn coaching off stays available while the download runs.": "שינוי שפה מציג כעת מיד את כפתור ההורדה הקולית ואת התקדמותו, והאפשרות «כבה את האימון» נשארת זמינה בזמן ההורדה.",
    "When coaching is on, choosing a voice or language downloads that voice automatically. When coaching is off, use the Download local voice button, which shows clip progress while it copies.": "כאשר האימון פועל, בחירת קול או שפה מורידה את הקול הזה אוטומטית. כאשר האימון כבוי, השתמש בלחצן «הורד קול מקומי», שמציג את התקדמות הקליפים בזמן ההעתקה.",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "לכל קול במאמן הקולי יש כעת כפתור הורדה משלו, כולל כל חמשת הקולות באנגלית וכל שפה מתורגמת. בחירת קול עדיין מתחילה את ההורדה שלו כאשר האימון פועל.",
  },
  bg: {
    "Couldn't load the changelog": "Дневникът на промените не можа да се зареди",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Всеки глас в «Гласов треньор» вече има свой собствен бутон за изтегляне, включително всичките пет английски гласа и всеки преведен език. Избирането на глас все още започва изтеглянето му, когато обучението е включено.",
  },
  bs: {
    "Full changelog": "Potpuni dnevnik promjena",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Svaki glas u «Glasovni trener» sada ima svoje dugme za preuzimanje, uključujući svih pet engleskih glasova i svaki prevedeni jezik. Odabir glasa i dalje počinje njegovo preuzimanje kada je obuka uključena.",
  },
  sr: { "Full changelog": "Потпуни дневник промена" },
  ca: {
    "Removed features": "Funcions eliminades",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Cada veu de «Entrenador de veu» ara té el seu propi botó de descàrrega, incloses les cinc veus en anglès i cada idioma traduït. La selecció d'una veu encara comença la seva baixada quan l'entrenament està activat.",
  },
  fi: {
    "New features": "Uudet ominaisuudet",
    "Improvements": "Parannukset",
    "Bug fixes": "Virheenkorjaukset",
    "Removed features": "Poistetut ominaisuudet",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Jokaisella äänellä «Äänivalmentaja»-osiossa on nyt oma latauspainike, mukaan lukien kaikki viisi englanninkielistä ääntä ja jokainen käännetty kieli. Äänen valitseminen aloittaa silti sen lataamisen, kun valmennus on päällä.",
  },
  pt: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Cada voz no «Treinador de voz» agora tem seu próprio botão de download, incluindo as cinco vozes em inglês e cada idioma traduzido. Selecionar uma voz ainda inicia o download quando o coaching está ativado.",
  },
  ru: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "В разделе «Голосовой тренер» у каждого голоса теперь есть собственная кнопка загрузки, включая все пять английских голосов и каждый переведённый язык. Выбор голоса по-прежнему запускает его загрузку, когда обучение включено.",
  },
  ja: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "「ボイスコーチ」のすべての音声に、5 つの英語音声と翻訳された各言語を含め、独自のダウンロード ボタンが追加されました。コーチングがオンの場合でも、音声を選択するとダウンロードが開始されます。",
  },
  tr: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "«Sesli koç» bölümündeki her sesin artık kendi indirme düğmesi var; buna beş İngilizce sesin tamamı ve çevrilen her dil dahil. Koçluk açıkken bir ses seçildiğinde indirme işlemi yine de başlar.",
  },
  ko: {
    "Improvements": "개선 사항",
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "이제 «음성 코치»의 모든 음성에는 5개의 영어 음성과 각 번역 언어를 포함해 자체 다운로드 버튼이 있습니다. 코칭이 켜져 있을 때 음성을 선택해도 다운로드가 시작됩니다.",
  },
  nl: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Elke stem in «Stemcoach» heeft nu een eigen downloadknop, inclusief alle vijf de Engelse stemmen en elke vertaalde taal. Als u een stem selecteert, wordt het downloaden nog steeds gestart wanneer coaching is ingeschakeld.",
  },
  fil: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Ang bawat boses sa «Boses coach» ay mayroon nang sariling download button, kasama ang lahat ng limang English na boses at bawat isinaling wika. Ang pagpili ng boses ay magsisimula pa rin sa pag-download nito kapag naka-on ang coaching.",
  },
  uk: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "У розділі «Голосовий тренер» кожен голос тепер має власну кнопку завантаження, включно з усіма п’ятьма голосами англійською мовою та кожною мовою перекладу. Вибір голосу все одно починає його завантаження, коли ввімкнено навчання.",
  },
  sv: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Varje röst i «Röstcoach» har nu sin egen nedladdningsknapp, inklusive alla fem engelska rösterna och varje översatt språk. Att välja en röst startar fortfarande nedladdningen när coaching är på.",
  },
  hu: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "A «Hangos edző» minden hangjához mostantól saját letöltési gomb tartozik, beleértve mind az öt angol hangot és minden lefordított nyelvet. Ha kiválaszt egy hangot, a letöltés akkor is elindul, ha a coaching be van kapcsolva.",
  },
  da: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Hver stemme i «Stemmecoach» har nu sin egen downloadknap, inklusive alle fem engelske stemmer og hvert oversat sprog. Valg af en stemme starter stadig dens download, når coaching er aktiveret.",
  },
  no: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Hver stemme i «Stemmecoach» har nå sin egen nedlastingsknapp, inkludert alle fem engelske stemmene og hvert oversatt språk. Å velge en stemme starter fortsatt nedlastingen når coaching er på.",
  },
  hr: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Svaki glas u «Glasovni trener» sada ima vlastiti gumb za preuzimanje, uključujući svih pet engleskih glasova i svaki prevedeni jezik. Odabirom glasa još uvijek počinje njegovo preuzimanje kada je obučavanje uključeno.",
  },
  sl: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Vsak glas v «Glasovni trener» ima zdaj svoj gumb za prenos, vključno z vsemi petimi angleškimi glasovi in vsakim prevedenim jezikom. Če izberete glas, se še vedno začne prenos, ko je vklopljeno poučevanje.",
  },
  lv: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Katrai balsij sadaļā «Balss treneris» tagad ir sava lejupielādes poga, tostarp visas piecas angļu valodas balsis un katra tulkotā valoda. Balss atlase joprojām sāk lejupielādi, kad apmācība ir ieslēgta.",
  },
  et: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Igal häälel jaotises «Hääletreener» on nüüd oma allalaadimisnupp, sealhulgas kõik viis ingliskeelset häält ja iga tõlgitud keel. Hääle valimisel alustatakse selle allalaadimist ka siis, kui juhendamine on sisse lülitatud.",
  },
  is: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Sérhver rödd í «Raddarþjálfari» hefur nú sinn niðurhalshnapp, þar á meðal allar fimm ensku raddirnar og hvert þýtt tungumál. Með því að velja rödd byrjar samt niðurhal hennar þegar þjálfun er á.",
  },
  sq: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Çdo zë në «Trajner zëri» tani ka butonin e vet të shkarkimit, duke përfshirë të pesë zërat në anglisht dhe secilën gjuhë të përkthyer. Zgjedhja e një zëri ende fillon shkarkimin e tij kur trajnimi është aktiv.",
  },
  mk: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Секој глас во «Гласовен тренер» сега има свое копче за преземање, вклучувајќи ги сите пет англиски гласови и секој преведен јазик. Изборот на глас сè уште го започнува неговото преземање кога е вклучено обуката.",
  },
  az: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "«Səsli məşqçi» bölməsində hər bir səsin indi beş ingiliz səsi və hər bir tərcümə dili daxil olmaqla öz yükləmə düyməsi var. Kouçinq aktiv olduqda səsin seçilməsi onu endirməyə davam edir.",
  },
  vi: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Giờ đây, mỗi giọng nói trong «Huấn luyện viên giọng nói» đều có nút tải xuống riêng, bao gồm tất cả năm giọng nói tiếng Anh và từng ngôn ngữ được dịch. Việc chọn giọng nói vẫn bắt đầu tải xuống khi huấn luyện được bật.",
  },
  af: {
    "Every voice in Voice coach now has its own download button, including all five English voices and each translated language. Selecting a voice still starts its download when coaching is on.": "Elke stem in «Stemafrigter» het nou sy eie aflaaiknoppie, insluitend al vyf Engelse stemme en elke vertaalde taal. Deur 'n stem te kies, begin die aflaai daarvan steeds wanneer afrigting aan is.",
  },
};
