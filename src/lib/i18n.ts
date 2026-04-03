export type Locale = 'ru' | 'en'

export type Copy = {
  title: string
  subtitle: (n: number) => string
  playLive: string
  playPractice: string
  helpButton: string
  subtitleLive: (n: number) => string
  subtitlePractice: (n: number) => string
  modeLiveBadge: string
  modePracticeBadge: string
  /** До смены общего слова (live) */
  liveRoundCountdownLabel: string
  newGameLive: string
  newGamePractice: string
  languageLabel: string
  lettersLabel: string
  themeLabel: string
  themeDark: string
  themeLight: string
  langRu: string
  langEn: string
  lettersN: (n: number) => string
  boardAria: string
  keyboardAria: string
  enterWordLength: (n: number) => string
  notInDictionary: string
  alreadyUsed: string
  hintPlaying: string
  won: (word: string) => string
  lost: (word: string) => string
  enterKey: string
  backspaceKey: string
  changeSettings: string
  loadingGame: string
  loadFailed: string
  retryLoad: string
  adminLink: string
  suggestWord: string
  suggestSent: string
  suggestDuplicate: string
  suggestError: (code: string) => string
  adminTitle: string
  adminLoginUser: string
  adminLoginPass: string
  adminLoginSubmit: string
  adminLoginError: string
  adminNotConfigured: string
  adminLogout: string
  adminEmptyList: string
  adminWord: string
  adminLang: string
  adminSuggestedAt: string
  adminApprove: string
  adminDismiss: string
  adminBackToGame: string
  adminLoadError: string
  adminEncryptionMissing: string
  adminFirstRunTitle: string
  adminFirstRunHint: string
  adminPasswordAgain: string
  adminRegisterSubmit: string
  adminPasswordMismatch: string
  adminAlreadyRegistered: string
  userAccountLink: string
  authHubTitle: string
  authUnifiedSignInHint: string
  adminSessionActiveHub: string
  adminGotoPanel: string
  userLoginTab: string
  userRegisterTab: string
  userNickname: string
  userPassword: string
  userPasswordAgain: string
  userLoginSubmit: string
  userRegisterSubmit: string
  userSwitchToRegister: string
  userSwitchToLogin: string
  userLogout: string
  /** Сумма очков по общим (live) раундам в БД */
  userLiveScoreTotal: (n: number) => string
  leaderboardMonthTitle: string
  leaderboardMonthLoading: string
  leaderboardMonthEmpty: string
  leaderboardMonthPts: (n: number) => string
  userLoggedInAs: (username: string) => string
  userWelcomeAuthed: string
  userContinueToGame: string
  userUsernameRules: string
  userLoginError: string
  userRegisterError: string
  userPasswordMismatch: string
  userUsernameTaken: string
  userBadUsername: string
  userBadPassword: string
}

const copy: Record<Locale, Copy> = {
  ru: {
    title: 'DayWord',
    subtitle: (n) =>
      `Настройте язык и длину (${n} букв). Затем — общий раунд (одно слово на всех, смена каждые 3 ч) или тренировка.`,
    playLive: 'Играть',
    playPractice: 'Тренировка',
    helpButton: 'Помощь',
    subtitleLive: (n) =>
      `Одно слово на всех, обновление каждые 3 часа. ${n} букв, 6 попыток.`,
    subtitlePractice: (n) => `Случайное слово только для вас. ${n} букв, 6 попыток.`,
    modeLiveBadge: 'Общий раунд · 3 ч',
    modePracticeBadge: 'Тренировка',
    liveRoundCountdownLabel: 'Новое слово через',
    newGameLive: 'Сбросить попытки',
    newGamePractice: 'Новое слово',
    languageLabel: 'Язык',
    lettersLabel: 'Букв в слове',
    themeLabel: 'Тема',
    themeDark: 'Тёмная',
    themeLight: 'Светлая',
    langRu: 'Русский',
    langEn: 'English',
    lettersN: (n) => `${n}`,
    boardAria: 'Игровое поле',
    keyboardAria: 'Экранная клавиатура',
    enterWordLength: (n) => `Введите слово из ${n} букв`,
    notInDictionary: 'Такого слова нет в словаре игры',
    alreadyUsed: 'Это слово уже было',
    hintPlaying: 'Введите слово и нажмите Enter',
    won: (word) => `Победа! Слово: ${word}`,
    lost: (word) => `Попытки закончились. Слово: ${word}`,
    enterKey: 'Enter',
    backspaceKey: 'Стереть',
    changeSettings: 'Настройки',
    loadingGame: 'Загрузка слова из словаря…',
    loadFailed: 'Не удалось загрузить словарь. Проверьте API и БД.',
    retryLoad: 'Повторить',
    adminLink: 'Админ',
    suggestWord: 'Предложить это слово',
    suggestSent: 'Спасибо, слово отправлено на проверку',
    suggestDuplicate: 'Это слово уже в списке предложенных',
    suggestError: (code) => `Не удалось отправить (${code})`,
    adminTitle: 'Админ: предложенные слова',
    adminLoginUser: 'Логин',
    adminLoginPass: 'Пароль',
    adminLoginSubmit: 'Войти',
    adminLoginError: 'Неверный логин или пароль',
    adminNotConfigured: 'Админка не настроена на сервере',
    adminLogout: 'Выйти',
    adminEmptyList: 'Нет предложенных слов',
    adminWord: 'Слово',
    adminLang: 'Язык',
    adminSuggestedAt: 'Когда',
    adminApprove: 'В словарь',
    adminDismiss: 'Отклонить',
    adminBackToGame: 'К игре',
    adminLoadError: 'Ошибка загрузки',
    adminEncryptionMissing:
      'На сервере не задан ADMIN_ENCRYPTION_KEY (64 hex-символа). Без ключа админка не работает.',
    adminFirstRunTitle: 'Первый вход: создайте администратора',
    adminFirstRunHint: 'Задайте логин и пароль администратора — поля не заполняются автоматически.',
    adminPasswordAgain: 'Пароль ещё раз',
    adminRegisterSubmit: 'Создать и войти',
    adminPasswordMismatch: 'Пароли не совпадают',
    adminAlreadyRegistered: 'Учётная запись уже создана — войдите',
    userAccountLink: 'Аккаунт',
    authHubTitle: 'Вход',
    authUnifiedSignInHint:
      'Те же поля для игрока и администратора: при верных данных админа откроется панель, иначе выполняется вход в игру.',
    adminSessionActiveHub: 'Сессия администратора активна.',
    adminGotoPanel: 'Панель предложений',
    userLoginTab: 'Вход',
    userRegisterTab: 'Регистрация',
    userNickname: 'Имя пользователя',
    userPassword: 'Пароль',
    userPasswordAgain: 'Пароль ещё раз',
    userLoginSubmit: 'Войти',
    userRegisterSubmit: 'Зарегистрироваться',
    userSwitchToRegister: 'Нет аккаунта? Зарегистрироваться',
    userSwitchToLogin: 'Уже есть аккаунт? Войти',
    userLogout: 'Выйти',
    userLiveScoreTotal: (n) => `· ${n} в зачёте`,
    leaderboardMonthTitle: 'Зачёт месяца (топ-3)',
    leaderboardMonthLoading: 'Загрузка лидерборда…',
    leaderboardMonthEmpty: 'Пока нет результатов',
    leaderboardMonthPts: (n) => `${n} очков`,
    userLoggedInAs: (username) => `Вы вошли как ${username}`,
    userWelcomeAuthed: 'Вы вошли в аккаунт.',
    userContinueToGame: 'К игре',
    userUsernameRules: '3–32 символа: латиница a–z, цифры, символ _',
    userLoginError: 'Неверное имя пользователя или пароль',
    userRegisterError: 'Не удалось зарегистрироваться',
    userPasswordMismatch: 'Пароли не совпадают',
    userUsernameTaken: 'Это имя уже занято',
    userBadUsername: 'Некорректное имя (см. подсказку ниже)',
    userBadPassword: 'Пароль: от 6 до 256 символов',
  },
  en: {
    title: 'DayWord',
    subtitle: (n) =>
      `Pick language and length (${n} letters). Then play the live round (same word for everyone, new every 3h) or practice.`,
    playLive: 'Play',
    playPractice: 'Practice',
    helpButton: 'Help',
    subtitleLive: (n) =>
      `Same word for everyone; new word every 3 hours. ${n} letters, 6 tries.`,
    subtitlePractice: (n) => `Random word just for you. ${n} letters, 6 tries.`,
    modeLiveBadge: 'Live round · 3h',
    modePracticeBadge: 'Practice',
    liveRoundCountdownLabel: 'Next word in',
    newGameLive: 'Clear attempts',
    newGamePractice: 'New word',
    languageLabel: 'Language',
    lettersLabel: 'Word length',
    themeLabel: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    langRu: 'Русский',
    langEn: 'English',
    lettersN: (n) => String(n),
    boardAria: 'Game board',
    keyboardAria: 'On-screen keyboard',
    enterWordLength: (n) => `Enter a ${n}-letter word`,
    notInDictionary: 'Not in game dictionary',
    alreadyUsed: 'Already used',
    hintPlaying: 'Type a word and press Enter',
    won: (word) => `You won! Word: ${word}`,
    lost: (word) => `Out of tries. Word: ${word}`,
    enterKey: 'Enter',
    backspaceKey: 'Backspace',
    changeSettings: 'Settings',
    loadingGame: 'Loading word from dictionary…',
    loadFailed: 'Could not load dictionary. Check API and database.',
    retryLoad: 'Retry',
    adminLink: 'Admin',
    suggestWord: 'Suggest this word',
    suggestSent: 'Thanks — word submitted for review',
    suggestDuplicate: 'This word is already in the suggestion list',
    suggestError: (code) => `Could not submit (${code})`,
    adminTitle: 'Admin: suggested words',
    adminLoginUser: 'Username',
    adminLoginPass: 'Password',
    adminLoginSubmit: 'Sign in',
    adminLoginError: 'Invalid username or password',
    adminNotConfigured: 'Admin is not configured on the server',
    adminLogout: 'Log out',
    adminEmptyList: 'No suggested words',
    adminWord: 'Word',
    adminLang: 'Language',
    adminSuggestedAt: 'When',
    adminApprove: 'Add to dictionary',
    adminDismiss: 'Dismiss',
    adminBackToGame: 'Back to game',
    adminLoadError: 'Load error',
    adminEncryptionMissing:
      'ADMIN_ENCRYPTION_KEY (64 hex chars) is not set on the server. Admin UI cannot run without it.',
    adminFirstRunTitle: 'First-time setup: create administrator',
    adminFirstRunHint: 'Choose an admin username and password — fields start empty.',
    adminPasswordAgain: 'Confirm password',
    adminRegisterSubmit: 'Create and sign in',
    adminPasswordMismatch: 'Passwords do not match',
    adminAlreadyRegistered: 'An account already exists — sign in instead',
    userAccountLink: 'Account',
    authHubTitle: 'Sign in',
    authUnifiedSignInHint:
      'Same fields for player and admin: correct admin credentials open the panel; otherwise we sign you into the game.',
    adminSessionActiveHub: 'Administrator session is active.',
    adminGotoPanel: 'Suggestion panel',
    userLoginTab: 'Sign in',
    userRegisterTab: 'Register',
    userNickname: 'Username',
    userPassword: 'Password',
    userPasswordAgain: 'Confirm password',
    userLoginSubmit: 'Sign in',
    userRegisterSubmit: 'Create account',
    userSwitchToRegister: 'No account? Register',
    userSwitchToLogin: 'Already have an account? Sign in',
    userLogout: 'Log out',
    userLiveScoreTotal: (n) => `· ${n} pts (live)`,
    leaderboardMonthTitle: 'Monthly leaderboard (top-3)',
    leaderboardMonthLoading: 'Loading leaderboard…',
    leaderboardMonthEmpty: 'No results yet',
    leaderboardMonthPts: (n) => `${n} pts`,
    userLoggedInAs: (username) => `Signed in as ${username}`,
    userWelcomeAuthed: 'You are signed in.',
    userContinueToGame: 'Back to game',
    userUsernameRules: '3–32 characters: a–z, digits, underscore',
    userLoginError: 'Wrong username or password',
    userRegisterError: 'Registration failed',
    userPasswordMismatch: 'Passwords do not match',
    userUsernameTaken: 'That username is already taken',
    userBadUsername: 'Invalid username (see hint below)',
    userBadPassword: 'Password: 6–256 characters',
  },
}

export function t(locale: Locale): Copy {
  return copy[locale]
}
