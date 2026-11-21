/* =========================================================================
   autogen.js — 주제 한 줄 → 릴스 카피 자동 생성 (P4 규격)
   모바일(studio2.html)과 PC(pc.html)가 같은 엔진을 씁니다.

   P4 출력
     hook    : 14자 이내 (손해·반전·질문형)
     scenes  : 컷 수에 맞춘 [{ top_label(10자 이내), sub(16자 이내), voice }]
     cta     : 저장·팔로우 유도 1줄
     caption : 인스타 본문 3~4줄 · 이모지 2~3개 · 마지막 줄 질문형
     hashtags: 15개 (주제 핵심 5 + 카테고리 5 + 넓은 태그 5)

   · 기본 : API 키 없이 0.1초 안에 도는 한국어 템플릿 + 카테고리 엔진
            (리빙·수납 / 주방·가전 / 뷰티·패션 / 푸드·디저트 / 직구·가성비 / 일반)
   · 선택 : localStorage['studio2.tts.v1'] 의 OpenAI 키(또는 직접 입력)로
            gpt-4o-mini 생성 → 실패하면 내장 엔진으로 자동 폴백
   · 숫자 규칙 : 가격·수량은 주제에 적힌 것만 사용하고 절대 지어내지 않습니다.

   window.Autogen.generate(topic, styleHint, {cuts})          → 즉시(동기)
   await window.Autogen.generateAsync(topic, styleHint, opt)  → AI 시도 후 폴백
   window.Autogen.buildP4Prompt(topic, styleHint, cuts)       → 복사용 프롬프트
   ========================================================================= */
(() => {
  'use strict';

  const STORE_KEY = 'studio2.tts.v1';
  const AI_MODEL = 'gpt-4o-mini';
  const AI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  const TARGET_HASHTAGS = 15;

  /* ------------------------------------------------------------ 공용 상수 */
  const TEMPLATE_IDS = ['reels-deal', 'shorts-hook', 'shorts-vlog', 'shorts-list', 'info30', 'deal-review',
    'qna', 'step3', 'vlog-film', 'neon-hook', 'label-item', 'bold-outline', 'minimal-closeup'];
  const STYLE_IDS = ['outline', 'pinkPuff', 'butter', 'lime', 'coral', 'mint', 'sky', 'darkPill',
    'whiteBox', 'neon', 'cream', 'butterBox', 'boldOutline'];
  const BGM_IDS = ['chill', 'upbeat', 'vlog', 'hook'];
  const FONT_IDS = ['pretendard', 'gmarket', 'score', 'paperlogy', 'jua', 'nanumsquare', 'maruburi',
    'dohyeon', 'gaegu', 'nanumpen', 'singleday'];
  const ACCENT_IDS = ['lime', 'yellow', 'pink'];

  const BROAD_TAGS = ['릴스추천', '인스타릴스', '추천템', '살림템', '인스타쇼핑', '쇼츠', '꿀팁', '일상'];
  const BRANDS = ['다이소', '알리익스프레스', '알리', '테무', '아마존', '쿠팡', '무신사', '오늘의집', '이케아',
    '코스트코', '트레이더스', '유니클로', '자라', '올리브영', '쉬인', '이마트', '홈플러스', '컬리', '마켓컬리',
    '스타벅스', '네이버', '지마켓', '11번가'];
  const STOP = new Set(['리뷰', '후기', '추천', '꿀템', '모음', '베스트', 'best', 'top', '순위', '랭킹', '솔직',
    '언박싱', '비교', '사용기', '실사용', '템', '제품', '아이템', '리스트', '신상', '요즘', '진짜', '완전',
    '그냥', '제일', '최고', '특가', '세일', '할인', '최저가', '가성비', '직구', '자취', '살림', '새로', '산',
    '사용', '써봤어요', '해봤다', '정도', '느낌', '편한', '간단']);

  /* ------------------------------------------------------------ 스타일 힌트 */
  const STYLES = [
    { id: 'auto', label: '자동', emoji: '✨', desc: '주제에 맞춰 알아서' },
    { id: 'pastel', label: '파스텔 손글씨', emoji: '🩷', desc: '개구체 + 자간 +10 + 핑크 테두리',
      font: 'gaegu', weight: 700, spacing: 10, subtitleStyle: 'pinkPuff', accent: 'pink', templateId: 'vlog-film', bgm: 'upbeat' },
    { id: 'bold', label: '굵은 외곽선 고딕', emoji: '🖤', desc: '상단 두 줄 + 두꺼운 검정 외곽선',
      font: 'gmarket', weight: 900, spacing: 0, subtitleStyle: 'boldOutline', accent: 'yellow', templateId: 'bold-outline', bgm: 'upbeat' },
    { id: 'closeup', label: '무자막 클로즈업', emoji: '🔍', desc: '자막 최소 · 줌인 · 팝 BGM',
      font: 'jua', weight: 700, spacing: 2, subtitleStyle: 'outline', accent: 'lime', templateId: 'minimal-closeup', bgm: 'hook' },
    { id: 'deal', label: '직구 핫딜', emoji: '🛒', desc: '가격 비교 + 댓글 링크 CTA',
      font: 'gmarket', weight: 900, spacing: 1, subtitleStyle: 'butter', accent: 'yellow', templateId: 'reels-deal', bgm: 'hook', category: 'deal' },
    { id: 'jip', label: '자취 꿀템', emoji: '🏠', desc: '스텝 체크 + 형광 마커',
      font: 'pretendard', weight: 800, spacing: 1, subtitleStyle: 'lime', accent: 'lime', templateId: 'step3', bgm: 'chill', category: 'living' },
  ];
  const styleOf = (hint) => {
    const h = String(hint == null ? '' : hint).trim();
    if (!h) return STYLES[0];
    const low = h.toLowerCase();
    return STYLES.find((s) => s.id === low) || STYLES.find((s) => s.label === h)
      || STYLES.find((s) => low.includes(s.id) || h.includes(s.label)) || STYLES[0];
  };

  /* ============================================================ 카테고리 엔진
     angle 하나가 카피 한 세트입니다.
       title / titleCount : 컷 수를 모를 때는 title, 주제에 수량이 있으면 titleCount
       hook               : 14자 이내 (hookPrice 는 가격이 있을 때만)
       labels             : 컷별 상단 라벨 (10자 이내)
       subs               : 컷별 자막 (16자 이내)
       voice              : 내레이션 다섯 문장 (컷 수에 맞춰 나눠 씀)
       body/question/cta  : 인스타 본문 3~4줄 + 질문 + 저장·팔로우 CTA
     ※ 숫자는 {n}{unit}·{price}(=주제에 적힌 값)만 씁니다. 없는 수치·효능은 쓰지 않습니다. */
  const CATS = [
    {
      id: 'living', name: '리빙·수납',
      keys: ['다이소', '수납', '정리', '욕실', '살림', '청소', '빨래', '세탁', '행거', '서랍', '선반', '옷장',
        '인테리어', '커튼', '러그', '매트', '수건', '휴지', '쓰레기통', '밀폐', '정리함', '원룸', '이사', '걸이',
        '후크', '집', '홈', '거실', '침실', '베란다', '현관'],
      templateId: 'info30', subtitleStyle: 'lime', bgm: 'chill', font: 'pretendard', weight: 800, spacing: 0, accent: 'lime',
      tags: ['수납정리', '정리템', '다이소추천', '자취꿀템', '홈인테리어', '원룸정리', '살림꿀팁', '리빙'],
      angles: [
        {
          title: '이거 모르면 손해 보는 {core}',
          titleCount: '이거 모르면 손해 보는 {brand} {core} {n}{unit}',
          badge: '{brand} 추천 · 내돈내산',
          hook: '이거 모르면 손해예요',
          labels: ['한 번에 정리', '설치 방법', '물기 OK', '오래 써도', '재구매템'],
          subs: ['{core} 정리 끝', '붙이기만 하면 돼요', '물 묻어도 안 흘러요', '써봐도 그대로예요', '이건 재구매템이에요'],
          voice: [
            '{core} 찾고 계셨다면 잠깐만 봐주세요.',
            '{brand}에서 골라봤는데 생각보다 잘 맞았어요.',
            '못 하나 안 박고 붙이기만 하면 돼요.',
            '물기 있는 공간에서도 흐트러지지 않아요.',
            '가격도 부담 없어서 하나씩 늘리기 좋아요.',
          ],
          body: ['{brand}에서 산 건데 못 안 박고 붙이는 타입이라 원룸·전세집에도 부담이 없어요.', '써보니 물건이 안 흘러내리고 자리가 딱 잡혀요.', '가격도 부담 없어서 하나씩 늘리기 좋아요.'],
          question: '여러분 집에서 제일 정리 안 되는 곳은 어디예요?',
          cta: '저장해두고 팔로우하면 다음 정리템도 바로 보여드려요 🙌',
          tags: ['수납템', '다이소수납'],
          emoji: ['🧺', '👀'],
        },
        {
          title: '{core} 하나로 집이 넓어졌어요',
          badge: '이사 다니며 남긴 템',
          hook: '집이 넓어지는 이유',
          labels: ['문제는 수납', '문 하나로 분리', '보이지 않게', '접어서 보관', '정착템'],
          subs: ['집이 좁게 느껴진다면', '{core}만 바꿔보세요', '문 하나로 공간 분리', '안 보이니 깔끔해요', '이건 진짜 정착템'],
          voice: [
            '집이 좁게 느껴질 때는 물건을 버리는 것보다 {core를} 바꾸는 게 빨라요.',
            '문 하나로 공간이 나뉘고 안이 안 보이니까 그 자리가 바로 깔끔해져요.',
            '이사할 때는 접어서 들고 가면 돼요.',
            '같은 평수인데도 훨씬 넓게 느껴져요.',
            '정리보다 수납을 바꾸는 쪽이 훨씬 편해요.',
          ],
          body: ['{core} 하나로 시야가 정리되면 같은 평수도 훨씬 넓게 느껴져요.', '문이 있는 타입이라 생활감이 그대로 가려져요.', '이사할 때도 접어서 들고 가면 돼요.'],
          question: '여러분 집은 어디가 제일 좁게 느껴지세요?',
          cta: '이사 준비할 때 꺼내보게 저장! 팔로우하면 계속 올라와요 🏠',
          tags: ['수납가구', '좁은집'],
          emoji: ['🏠', '💬'],
          templateId: 'label-item',
        },
        {
          title: '{core} 사기 전에 이것만 보세요',
          badge: '정리 오래 해본 기준',
          hook: '사기 전에 이것만',
          labels: ['사이즈 먼저', '문 앞 공간', '높이 조절', '재질 확인', '이 기준이면'],
          subs: ['{core} 살 때 기준', '사이즈부터 보세요', '문 앞이 막히면 끝', '높이 조절이 답', '이 기준이면 실패 없어요'],
          voice: [
            '정리하다 포기하는 이유는 대부분 사이즈예요.',
            '{core는} 문을 열었을 때 앞이 막히지 않는 깊이인지 먼저 보세요.',
            '높이 조절되는 걸로 고르면 물건이 늘어도 그대로 써요.',
            '재질은 물기 있는 공간에 두는지까지 생각해서 고르세요.',
            '이 기준만 지키면 실패가 거의 없어요.',
          ],
          body: ['문을 열었을 때 앞이 막히면 결국 안 쓰게 돼요.', '높이 조절되는 타입이면 물건이 늘어도 그대로 써요.', '이 세 가지만 보면 실패가 거의 없어요.'],
          question: '여러분은 수납템 살 때 뭘 먼저 보세요?',
          cta: '살 때마다 꺼내보게 저장! 팔로우도 부탁드려요 🙏',
          tags: ['정리수납', '수납팁'],
          emoji: ['📏', '🫶'],
          templateId: 'step3',
        },
      ],
    },
    {
      id: 'kitchen', name: '주방·가전',
      keys: ['에어프라이어', '전기포트', '믹서', '블렌더', '커피머신', '토스터', '밥솥', '인덕션', '전자레인지',
        '가습기', '선풍기', '청소기', '로봇', '드라이기', '고데기', '냉장고', '식기', '후라이팬', '냄비', '도마',
        '칼', '수저', '컵', '텀블러', '주방', '가전', '조리', '정수기', '식품건조기', '와플'],
      templateId: 'label-item', subtitleStyle: 'mint', bgm: 'upbeat', font: 'pretendard', weight: 800, spacing: 0, accent: 'lime',
      tags: ['주방가전', '주방템', '가전추천', '자취가전', '살림가전', '주방살림', '가성비가전', '가전리뷰'],
      angles: [
        {
          title: '{core}, 사기 전에 후회하는 이유',
          badge: '직접 사서 써본 후기',
          hook: '사기 전에 후회해요',
          labels: ['산 이유', '소음', '세척', '사이즈 체크', '결론'],
          subs: ['{core} 산 이유는요', '소음부터 달라요', '세척은 진짜 편해요', '사이즈는 미리 재세요', '결론은 사는 쪽이에요'],
          voice: [
            '{core} 살 때 제일 궁금한 게 소음이랑 세척이죠.',
            '오래 써보니 소음은 생각보다 조용한 편이에요.',
            '부품이 다 분리돼서 세척은 진짜 편해요.',
            '대신 사이즈가 커서 놓을 자리는 미리 재보고 사세요.',
            '단점을 감안해도 이 정도면 충분히 살 만해요.',
          ],
          body: ['소음은 영상으로 비교해봤어요. 생각보다 조용한 편이에요.', '부품이 전부 분리돼서 세척은 진짜 편해요.', '대신 사이즈가 커서 놓을 자리는 미리 재보세요.'],
          question: '여러분은 소음이랑 세척 중 뭐가 더 중요하세요?',
          cta: '살까 고민 중이면 저장! 팔로우하면 후기도 계속 올려요 🙌',
          tags: ['가전후기', '주방가전추천'],
          emoji: ['🔌', '💬'],
        },
        {
          title: '주방이 정리되는 {core}',
          badge: '요리 전후 비교',
          hook: '주방이 달라졌어요',
          labels: ['요리 전', '놓고 나서', '조리대 정리', '설거지 전', '사길 잘했어요'],
          subs: ['요리하면 난리 나죠', '{core} 하나 놓았을 뿐', '조리대가 비어 보여요', '정리 시간이 줄었어요', '이건 사길 잘했어요'],
          voice: [
            '요리만 하면 조리대가 난리가 나는데 {core} 하나 놓고 나서 달라졌어요.',
            '자주 쓰는 도구가 한 곳에 모이니까 조리대가 비어 보여요.',
            '설거지 전에 정리하는 시간도 확 줄었어요.',
            '그릇 쌓이는 속도가 느려진 것도 좋아요.',
            '주방 살림하는 분들한테는 특히 추천하고 싶어요.',
          ],
          body: ['자주 쓰는 도구를 한 곳에 모으면 조리대가 비어 보여요.', '정리 시간이 줄면 요리 시작이 훨씬 가벼워져요.', '가격 대비 만족도가 높았던 주방템이에요.'],
          question: '여러분 주방에서 제일 불편한 동선은요?',
          cta: '주방 살림하는 사람 저장! 팔로우하면 꿀템 계속 올라와요 🍳',
          tags: ['주방정리', '주방꿀템'],
          emoji: ['🍳', '👀'],
          templateId: 'info30',
        },
        {
          title: '{core} 오래 써보고 남은 결론',
          badge: '한참 써본 솔직 결론',
          hook: '결론부터 말할게요',
          labels: ['처음 느낌', '매일 쓰는 중', '단점 하나', '가격 생각', '남은 결론'],
          subs: ['처음엔 반신반의했어요', '지금은 매일 써요', '단점은 소음 하나', '가격 생각하면 살 만해요', '결론은 남는 장사예요'],
          voice: [
            '처음엔 반신반의하고 샀는데 지금은 매일 쓰는 물건이 됐어요.',
            '쓸수록 손이 가는 이유는 그냥 편해서예요.',
            '단점은 소음이 조금 있다는 것 정도고요.',
            '그거 감안하면 이 가격에 이 정도면 충분해요.',
            '결론은 사는 쪽이 남는 장사예요.',
          ],
          body: ['처음엔 반신반의했는데 지금은 매일 써요.', '단점은 소음 하나, 그 외엔 불만이 없어요.', '가격 생각하면 처음 사는 사람에게도 부담 없어요.'],
          question: '여러분은 단점 하나쯤 있으면 사는 편인가요?',
          cta: '실사용 후기 더 궁금하면 저장! 팔로우하면 이어서 올려요 ✅',
          tags: ['실사용후기', '가전리뷰'],
          emoji: ['✅', '🤔'],
          templateId: 'deal-review',
        },
      ],
    },
    {
      id: 'beauty', name: '뷰티·패션',
      keys: ['화장품', '크림', '세럼', '앰플', '립', '틴트', '쿠션', '파운데이션', '마스크팩', '클렌징', '선크림',
        '향수', '헤어', '옷', '코트', '가방', '신발', '스니커즈', '액세서리', '목걸이', '귀걸이', '니트', '원피스',
        '패션', '메이크업', '네일', '바디', '샴푸'],
      templateId: 'bold-outline', subtitleStyle: 'pinkPuff', bgm: 'vlog', font: 'gmarket', weight: 900, spacing: 0, accent: 'pink',
      tags: ['뷰티추천', '화장품추천', '데일리룩', '패션추천', '메이크업', '피부관리', '신상뷰티', '뷰티리뷰'],
      angles: [
        {
          title: '{core} 써본 솔직 후기',
          badge: '내돈내산 후기',
          hook: '써보니 달라요',
          labels: ['첫 느낌', '발림', '쓸수록', '아쉬운 점', '재구매'],
          subs: ['{core} 써봤어요', '첫날엔 발림이 낯설죠', '지나면 손이 가요', '아쉬운 점도 있어요', '이건 재구매할게요'],
          voice: [
            '{core} 써본 솔직 후기예요.',
            '첫날엔 발림이 조금 낯설었어요.',
            '며칠 지나니 손이 자연스럽게 가더라고요.',
            '아쉬운 점도 있는데, 그건 사람마다 다를 것 같아요.',
            '가격 생각하면 재구매할 것 같아요.',
          ],
          body: ['첫날보다 며칠 뒤가 훨씬 좋았어요.', '아침 준비 시간이 눈에 띄게 줄었어요.', '가격 생각하면 재구매할 것 같아요.'],
          question: '여러분은 어떤 제형을 제일 좋아하세요?',
          cta: '고민 중이면 저장! 팔로우하면 후기도 이어서 올려요 🫶',
          tags: ['화장품후기', '뷰티템'],
          emoji: ['💄', '🫶'],
        },
        {
          title: '{core} 하나면 끝나요',
          badge: '데일리 준비템',
          hook: '아침이 가벼워져요',
          labels: ['아침 준비', '하나로 끝', '겹쳐 발라도', '무너짐 없음', '출근템 확정'],
          subs: ['아침에 손 갈 일 없죠', '{core} 하나로 끝', '겹쳐 발라도 안 밀려요', '하루 종일 그대로예요', '이건 출근템 확정'],
          voice: [
            '아침에 손 갈 시간이 없을 때 {core} 하나면 끝나요.',
            '바르고 잠깐 기다리면 다음 단계로 넘어갈 수 있어요.',
            '그 위에 다른 걸 겹쳐 발라도 안 밀려요.',
            '하루 지나도 처음 그대로라서 손이 안 가요.',
            '출근 준비가 확실히 가벼워졌어요.',
          ],
          body: ['바르고 잠깐만 기다리면 다음 단계로 넘어갈 수 있어요.', '겹쳐 발라도 밀리지 않아서 출근날 쓰기 좋아요.', '하나로 끝나니까 화장대가 가벼워졌어요.'],
          question: '여러분 아침 준비는 몇 분 걸리세요?',
          cta: '아침이 바쁜 사람 저장! 팔로우하면 데일리템도 올려요 ⏰',
          tags: ['데일리뷰티', '출근템'],
          emoji: ['⏰', '✨'],
          templateId: 'vlog-film',
        },
        {
          title: '{core} 살까 말까 고민될 때',
          badge: '오래 써본 기준',
          hook: '사기 전에 확인하세요',
          labels: ['고민된다면', '용량보다', '색 확인', '조명 아래', '이 기준이면'],
          subs: ['{core} 고민된다면', '용량보다 사용감', '색은 자연광에서', '조명 아래서 보세요', '이 기준이면 실패 없어요'],
          voice: [
            '{core} 살까 말까 고민된다면 세 가지만 확인하세요.',
            '용량보다 사용감이 오래 만족스러워요.',
            '색은 꼭 자연광에서 봐야 해요.',
            '손에 묻었을 때 남는 느낌까지 보면 실패가 거의 없어요.',
            '이 기준만 지키면 후회가 줄어요.',
          ],
          body: ['용량보다 사용감이 오래 만족스러워요.', '색은 자연광에서 봐야 실패가 없어요.', '손에 남는 느낌까지 확인하면 거의 실패 없어요.'],
          question: '여러분은 화장품 살 때 뭘 제일 많이 보세요?',
          cta: '살 때마다 꺼내보게 저장! 팔로우도 부탁드려요 💗',
          tags: ['뷰티팁', '구매팁'],
          emoji: ['💗', '🔎'],
          templateId: 'step3',
        },
      ],
    },
    {
      id: 'food', name: '푸드·디저트',
      keys: ['찹쌀떡', '겹겹이', '디저트', '케이크', '빵', '베이커리', '마카롱', '쿠키', '아이스크림', '라면',
        '과자', '초콜릿', '음료', '커피', '떡', '한입', '편의점', '간식', '먹방', '맛집', '샌드', '도넛', '탕후루'],
      templateId: 'bold-outline', subtitleStyle: 'butter', bgm: 'upbeat', font: 'gmarket', weight: 900, spacing: 0, accent: 'yellow',
      tags: ['디저트추천', '먹거리', '간식추천', '카페투어', '빵집', '맛있는거', '편의점신상', '푸드'],
      angles: [
        {
          title: '{core} 반으로 갈라봤어요',
          badge: '속 확인 · 실물 그대로',
          hook: '갈라보면 답 나와요',
          labels: ['반으로 갈라', '속 보기', '찹쌀 식감', '한입 크기', '재구매'],
          subs: ['반으로 쪼개봤어요', '속이 이렇게 많아요', '찹쌀이 안 딱딱해요', '한입에 쏙 들어가요', '이건 사두면 후회 없어요'],
          voice: [
            '{core} 반으로 갈라봤어요.',
            '속이 생각보다 훨씬 많이 들어 있어요.',
            '찹쌀이 시간이 지나도 안 딱딱해져요.',
            '한입에 쏙 들어갈 정도로 작아서 손이 자주 가요.',
            '커피랑 같이 먹으면 진짜 잘 어울려요.',
          ],
          body: ['속이 사진보다 훨씬 많이 들어 있어요.', '찹쌀이 시간이 지나도 안 딱딱해요.', '커피랑 먹으면 딱이에요.'],
          question: '여러분은 떡이랑 뭐랑 같이 드세요?',
          cta: '먹어보고 싶으면 저장! 팔로우하면 디저트도 계속 올려요 🍡',
          tags: ['디저트맛집', '찹쌀떡'],
          emoji: ['🍡', '☕'],
        },
        {
          title: '{core}, 줄 설 만할까요?',
          badge: '먹어본 솔직 후기',
          hook: '먹어볼 만할까요?',
          labels: ['줄이 길어서', '사러 갔어요', '첫 입', '단맛', '재방문'],
          subs: ['줄이 길어서 궁금했어요', '{core} 사러 갔어요', '첫 입에 결론 나요', '단맛이 세지 않아요', '한 번은 먹어볼 만해요'],
          voice: [
            '{core} 사러 줄을 섰어요.',
            '첫 입에 결론이 나더라고요.',
            '단맛이 세지 않고 고소한 쪽이라 끝까지 먹게 돼요.',
            '크기는 작은데 속이 꽉 차 있어요.',
            '다음에 지나가면 또 살 것 같아요.',
          ],
          body: ['단맛이 세지 않아서 끝까지 먹게 돼요.', '고소한 쪽을 좋아하면 만족할 거예요.', '다음에 지나가면 또 살 것 같아요.'],
          question: '여러분은 줄 서서 먹는 편인가요?',
          cta: '카페 갈 때 꺼내보게 저장! 팔로우하면 맛집도 올려요 🧁',
          tags: ['웨이팅맛집', '디저트'],
          emoji: ['🧁', '💬'],
          templateId: 'vlog-film',
        },
        {
          title: '{core} 첫 입에 갈려요',
          badge: '나란히 비교',
          hook: '첫 입에 갈려요',
          labels: ['나란히 비교', '첫 입', '촉촉함', '가격', '결론'],
          subs: ['{core} 비교해봤어요', '첫 입에 순서가 갈려요', '촉촉한 쪽이 좋아요', '가격은 비슷해요', '결론은 이거예요'],
          voice: [
            '{core}를 나란히 놓고 비교해봤어요.',
            '첫 입에서 순서가 바로 갈리더라고요.',
            '촉촉한 쪽이 제 기준에서는 더 좋았어요.',
            '가격은 비슷해서 취향 차이예요.',
            '결론은 첫 입이 좋은 걸 사세요.',
          ],
          body: ['첫 입에서 순서가 갈려요.', '제 기준에서는 촉촉한 쪽이 좋았어요.', '가격은 비슷해서 취향 차이예요.'],
          question: '여러분은 촉촉한 쪽이 좋아요, 씹는 맛이 좋아요?',
          cta: '비교 필요하면 저장! 팔로우하면 비교도 계속 올라와요 ⚖️',
          tags: ['디저트비교', '푸드리뷰'],
          emoji: ['⚖️', '😋'],
          templateId: 'label-item',
        },
      ],
    },
    {
      id: 'deal', name: '직구·가성비',
      keys: ['알리', '테무', '아마존', '직구', '쿠팡', '할인', '가성비', '핫딜', '블프', '블랙프라이데이', '특가',
        '최저가', '세일', '쿠폰', '배송', '관부가세', '쉬인', '이베이', '역대가', '할인코드'],
      templateId: 'reels-deal', subtitleStyle: 'butter', bgm: 'hook', font: 'gmarket', weight: 900, spacing: 1, accent: 'yellow',
      tags: ['직구', '해외직구', '핫딜', '가성비템', '최저가', '쿠팡파트너스', '알리추천', '블프'],
      angles: [
        {
          title: '이 가격이면 {core} 안 살 이유 없죠',
          badge: '가격 확인 · 마감 임박',
          hook: '지금 이 가격 실화예요',
          hookPrice: '지금 {priceSale}예요',
          labels: ['정가 대비', '지금 가격', '배송 기간', '관부가세', '마감'],
          subs: ['정가 주고 산 사람 손', '지금 *{priceSale}* 실화', '배송은 생각보다 빨라요', '관부가세 확인했어요', '지금이 마지막이에요'],
          voice: [
            '정가 주고 산 사람 손 들어 주세요.',
            '{core가} 지금 {price}예요.',
            '배송은 생각보다 빨리 왔어요.',
            '관부가세까지 확인하고 산 거예요.',
            '이 가격이 언제까지 갈지는 모르니까 미리 담아두세요.',
          ],
          body: ['정가 대비 확 내려온 가격이에요.', '배송은 생각보다 빨리 왔어요.', '관부가세까지 확인하고 산 거예요.'],
          question: '여러분은 직구할 때 배송비까지 계산하시나요?',
          cta: '가격 오르기 전에 저장! 팔로우하면 핫딜도 계속 보내드려요 🔥',
          tags: ['해외직구추천', '역대가'],
          emoji: ['🔥', '💬'],
        },
        {
          title: '{core}, 지금이 제일 싸요',
          badge: '가격 지켜본 결과',
          hook: '지금이 제일 싸요',
          labels: ['가격 지켜봄', '지난달보다', '쿠폰까지', '배송비 포함', '이번 주'],
          subs: ['가격 계속 지켜봤어요', '{core} 지금이 최저', '지난달보다 내려갔어요', '쿠폰까지 먹이면 더', '이번 주 지나면 올라요'],
          voice: [
            '{core} 가격을 계속 지켜봤어요.',
            '지금이 제일 싸요.',
            '지난달보다 확 내려갔고 쿠폰까지 먹이면 더 싸져요.',
            '배송비까지 넣고 비교해도 이쪽이 낫더라고요.',
            '이번 주 지나면 다시 오를 것 같아서 미리 알려드려요.',
          ],
          body: ['지난달보다 가격이 내려갔어요.', '쿠폰을 같이 쓰면 더 싸져요.', '이번 주 지나면 오를 가능성이 높아요.'],
          question: '여러분은 가격 내려갈 때까지 기다리는 편인가요?',
          cta: '놓치면 아까우니 저장! 팔로우하면 가격 변동도 알려드려요 📉',
          tags: ['최저가', '가격추적'],
          emoji: ['📉', '🫶'],
          templateId: 'deal-review',
        },
        {
          title: '{core} 직구 전에 꼭 보세요',
          badge: '직구 오래 해본 기준',
          hook: '직구 전에 꼭 보세요',
          labels: ['실패 이유', '볼륨·전압', '리뷰 보는 법', '배송비 포함', '이 기준이면'],
          subs: ['직구하다 실패한 이유', '볼륨·전압부터 확인', '리뷰는 사진만 보세요', '배송비 포함 가격으로', '이것만 보면 실패 없어요'],
          voice: [
            '{core} 직구 전에 몇 가지만 확인하세요.',
            '볼륨과 전압이 우리나라 기준에 맞는지 먼저 보세요.',
            '리뷰는 사진이 있는 것만 보세요.',
            '배송비 포함 가격으로 비교해야 진짜 싼지 알 수 있어요.',
            '교환 조건까지 보면 실패가 거의 없어요.',
          ],
          body: ['볼륨·전압이 국내 기준에 맞는지 먼저 보세요.', '리뷰는 사진이 붙은 것만 믿으세요.', '배송비 포함 가격으로 비교해야 진짜 싸요.'],
          question: '여러분은 직구할 때 뭐부터 확인하세요?',
          cta: '직구 전에 저장! 팔로우하면 체크리스트도 올려요 🧾',
          tags: ['직구팁', '직구주의'],
          emoji: ['🧾', '👀'],
          templateId: 'step3',
        },
      ],
    },
    {
      id: 'general', name: '일반',
      keys: [],
      templateId: 'info30', subtitleStyle: 'outline', bgm: 'vlog', font: 'pretendard', weight: 800, spacing: 0, accent: 'lime',
      tags: ['추천', '꿀팁', '리뷰', '정보', '일상', '릴스', '정리', '활용'],
      angles: [
        {
          title: '{core}, 이거 하나로 정리됐어요',
          badge: '직접 써보고 쓴 후기',
          hook: '결론부터 말할게요',
          labels: ['고민했다면', '결론', '쓸수록', '아쉬운 점', '추천'],
          subs: ['{core} 고민하고 있었다면', '결론부터 말하면 사세요', '쓸수록 편해져요', '아쉬운 점도 있어요', '이건 남에게도 추천해요'],
          voice: [
            '{core} 고민하고 있었다면 결론부터 말할게요.',
            '사세요.',
            '처음엔 반신반의했는데 쓸수록 편해져요.',
            '아쉬운 점도 있는데 가격이 커버해요.',
            '주변에도 추천하고 있는 물건이에요.',
          ],
          body: ['처음보다 쓸수록 더 만족스러워요.', '매일 쓰는 물건이 됐어요.', '주변에도 추천하고 있어요.'],
          question: '여러분은 살까 말까 고민 길게 하는 편인가요?',
          cta: '필요한 사람 저장! 팔로우하면 후기도 계속 올려요 🙌',
          tags: ['내돈내산', '솔직후기'],
          emoji: ['🙌', '💬'],
        },
        {
          title: '{core} 핵심만 말할게요',
          badge: '핵심만 정리',
          hook: '핵심만 말할게요',
          labels: ['핵심만', '쓰기 쉬움', '정리 간단', '가격 착함', '정리'],
          subs: ['{core} 핵심만 말할게요', '쓰기가 쉬워요', '정리도 간단해요', '가격이 착해요', '이 셋이면 충분해요'],
          voice: [
            '{core} 핵심만 말할게요.',
            '첫째, 쓰기가 쉬워요.',
            '둘째, 정리가 간단해요.',
            '셋째, 가격이 착해요.',
            '이 세 개만 봐도 살지 말지 결정됩니다.',
          ],
          body: ['쓰기가 쉬워서 매일 손이 가요.', '정리도 간단해서 부담이 없어요.', '가격도 착해서 하나쯤 두기 좋아요.'],
          question: '여러분은 이 중에 뭐가 제일 중요하세요?',
          cta: '결정에 도움 됐으면 저장! 팔로우하면 계속 정리해드려요 ✅',
          tags: ['정보', '꿀팁'],
          emoji: ['✅', '👀'],
          templateId: 'label-item',
        },
        {
          title: '{core} 솔직하게 말해볼게요',
          badge: '광고 아님 · 내돈내산',
          hook: '솔직하게 말할게요',
          labels: ['솔직 후기', '좋은 점', '진짜 좋은 부분', '아쉬운 점', '그래도'],
          subs: ['{core} 솔직하게 말할게요', '좋은 점부터 말하면요', '진짜 좋은 건 이 부분', '아쉬운 점도 있어요', '그래도 살 만한 이유'],
          voice: [
            '{core} 솔직하게 말해볼게요.',
            '좋은 점은 쓰는 순간 바로 느껴져요.',
            '특히 이 부분이 진짜 좋아요.',
            '아쉬운 점도 있는데, 그건 사람마다 다를 것 같아요.',
            '그래도 이 가격이면 충분히 살 만해요.',
          ],
          body: ['좋은 점은 쓰는 순간 바로 느껴져요.', '아쉬운 점도 있지만 가격이 커버해요.', '광고 아님, 직접 산 물건이에요.'],
          question: '여러분은 아쉬운 점 있으면 참고 사는 편인가요?',
          cta: '더 궁금하면 저장! 팔로우하면 솔직 후기도 올려요 🙃',
          tags: ['솔직리뷰', '광고아님'],
          emoji: ['🙃', '💬'],
        },
      ],
    },
  ];

  /* ------------------------------------------------------------ 주제 해석 */
  const PARTICLES = ['에서', '에게', '으로', '이랑', '하고', '보다', '랑', '과', '와', '을', '를', '은', '는', '의', '에', '도', '만', '로'];
  const stripParticle = (w) => {
    const s = String(w || '').replace(/[,.!?~"'“”‘’()\[\]]/g, '').trim();
    for (const p of PARTICLES) if (s.length - p.length >= 2 && s.endsWith(p)) return s.slice(0, -p.length);
    if (s.length - 1 >= 3 && /[이가]$/.test(s)) return s.slice(0, -1);
    return s;
  };
  const hasBatchim = (w) => {
    const s = String(w || '').trim();
    if (!s) return false;
    const code = s.charCodeAt(s.length - 1);
    if (code < 0xac00 || code > 0xd7a3) return false;
    return (code - 0xac00) % 28 !== 0;
  };
  const josa = (w, withB, withOutB) => `${w}${hasBatchim(w) ? withB : withOutB}`;
  const hash = (s) => {
    let h = 2166136261;
    const str = String(s || '');
    for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function parseTopic(raw) {
    const text = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
    const words = text.split(' ').map(stripParticle).filter(Boolean);
    const countMatch = text.match(/(\d{1,2})\s*(가지|선|개|종|컷|단계|곳|위)/);
    const n = countMatch ? Math.max(1, Math.min(9, Number(countMatch[1]))) : 0;
    let unit = countMatch ? countMatch[2] : '가지';
    if (unit === '위') unit = '곳';
    const brand = BRANDS.find((b) => text.includes(b)) || '';
    const cleaned = words.filter((w) => !STOP.has(w) && !/^\d+$/.test(w) && w !== brand
      && !/^\d{1,2}(가지|선|개|종|컷|단계|곳|위)$/.test(w) && w.length >= 2);
    const core = (cleaned.slice(0, 3).join(' ') || text || '요즘 뜨는 템').slice(0, 20);
    return {
      raw: text, brand, brandLabel: brand === '알리익스프레스' ? '알리' : brand, n, hasCount: n > 0, unit, core,
      core1: cleaned[0] || core,
      kw: cleaned[cleaned.length - 1] || cleaned[0] || core,
      words: cleaned, text,
    };
  }

  /* 숫자는 주제에 적힌 것만 — 없으면 빈 값 */
  function parsePrice(raw) {
    const t = String(raw || '');
    let m = t.match(/(\d{1,3}(?:,\d{3})+)\s*원?\s*(?:→|->|에서|보다)\s*(\d{1,3}(?:,\d{3})+)/);
    if (m) return { orig: m[1], sale: m[2], text: `${m[1]} → ${m[2]}` };
    m = t.match(/(\d{1,2}(?:\.\d)?)\s*만\s*원대/);
    if (m) return { orig: '', sale: `${m[1]}만원대`, text: `${m[1]}만원대` };
    m = t.match(/(\d{1,3}(?:,\d{3})+)\s*원/);
    if (m) return { orig: '', sale: `${m[1]}원`, text: `${m[1]}원` };
    return { orig: '', sale: '', text: '' };
  }

  function detectCategory(text, style) {
    if (style && style.category) {
      const forced = CATS.find((c) => c.id === style.category);
      if (forced) return forced;
    }
    const low = String(text || '').toLowerCase();
    let best = null; let bestScore = 0;
    for (const c of CATS) {
      let score = 0;
      for (const k of c.keys) if (k && low.includes(k.toLowerCase())) score += k.length;
      if (score > bestScore) { best = c; bestScore = score; }
    }
    return best || CATS[CATS.length - 1];
  }

  function fill(str, ctx) {
    let s = String(str == null ? '' : str);
    s = s.replace(/\{brand\}에서 /g, ctx.brand ? `${ctx.brand}에서 ` : '')
      .replace(/\{brand\}에서/g, ctx.brand ? `${ctx.brand}에서` : '')
      .replace(/\{brand\} /g, ctx.brand ? `${ctx.brand} ` : '')
      .replace(/\{brand\}/g, ctx.brand || '요즘')
      .replace(/\{priceSale\}/g, ctx.priceSale || '이 가격')
      .replace(/\{price\}/g, ctx.price || '이 가격')
      .replace(/\{n\}/g, String(ctx.n))
      .replace(/\{unit\}/g, ctx.unit)
      .replace(/\{core는\}/g, josa(ctx.core, '은', '는'))
      .replace(/\{core가\}/g, josa(ctx.core, '이', '가'))
      .replace(/\{core를\}/g, josa(ctx.core, '을', '를'))
      .replace(/\{core와\}/g, josa(ctx.core, '과', '와'))
      .replace(/\{core1\}/g, ctx.core1)
      .replace(/\{kw\}/g, ctx.kw)
      .replace(/\{core\}/g, ctx.core);
    return s.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
  }
  const plain = (s) => String(s || '').replace(/\*/g, '').replace(/[ \t]{2,}/g, ' ').trim();
  /* 자막 글자수 제한 — 단어 경계에서 자르고, 넘치면 잘라서 말줄임 없이 정리 */
  function fit(s, max) {
    const str = String(s || '').trim();
    if (str.length <= max) return str;
    const cut = str.slice(0, max);
    const sp = cut.lastIndexOf(' ');
    return (sp >= max - 4 ? cut.slice(0, sp) : cut).trim();
  }

  /* ------------------------------------------------------------ 컷 구성 */
  const SENT_SPLIT = /(?<=[.!?])\s+/;
  function voiceChunks(angle, needed) {
    let chunks = angle.voice.map((v) => plain(v)).filter(Boolean);
    if (chunks.length < needed) {
      chunks = chunks.flatMap((c) => {
        const parts = c.split(/,\s+/).map((x) => x.trim()).filter(Boolean);
        return parts.map((x, i) => (i < parts.length - 1 ? `${x},` : x));
      });
    }
    return chunks;
  }

  /* 컷 수에 맞춰 다섯 칸(라벨·자막·대본)을 고르게 폅니다 — 마지막 컷은 항상 마무리 */
  const spread = (i, cuts, len) => {
    if (len <= 0) return 0;
    if (cuts >= len) return Math.min(i, len - 1);
    return Math.floor((i * (len - 1)) / Math.max(1, cuts - 1));
  };

  function buildScenes(angle, ctx, cuts) {
    const chunks = voiceChunks(angle, cuts);
    const out = [];
    for (let i = 0; i < cuts; i += 1) {
      const extra = i >= angle.labels.length;
      const li = extra ? angle.labels.length - 1 : spread(i, cuts, angle.labels.length);
      const vi = chunks.length ? spread(i, cuts, chunks.length) : -1;
      out.push({
        top_label: fit(fill(extra ? '한 번 더' : angle.labels[li], ctx), 10),
        sub: fit(fill(angle.subs[li], ctx), 16),
        voice: vi >= 0 ? plain(fill(chunks[vi], ctx)) : '',
      });
    }
    return out;
  }

  function buildCaption(angle, ctx, hookText) {
    const body = angle.body.map((b) => fill(b, ctx));
    const [e1, e2] = angle.emoji || ['✨', '💬'];
    const L = [];
    L.push(`${hookText} ${e1}`);
    L.push(body[0]);
    L.push([body[1], body[2]].filter(Boolean).join(' '));
    L.push(`${fill(angle.question, ctx)} ${e2}`);
    return L.join('\n');
  }

  /* 해시태그 15개 = 주제 핵심 5 + 카테고리 5 + 넓은 태그 5 */
  function buildHashtags(parsed, cat, angle) {
    const core = [];
    const catTags = [];
    const broad = [];
    const add = (arr, t) => {
      const s = String(t == null ? '' : t).replace(/^#+/, '').replace(/[^0-9A-Za-z가-힣_]/g, '');
      if (s.length < 2) return;
      arr.push(`#${s}`);
    };
    add(core, parsed.brandLabel);
    const joined = parsed.words.join('').replace(/\s/g, '');
    if (joined && joined.length <= 12) add(core, joined);
    parsed.words.slice(0, 2).forEach((w) => add(core, w));
    (angle.tags || []).forEach((t) => add(core, t));
    cat.tags.slice(0, 6).forEach((t) => add(catTags, t));
    BROAD_TAGS.slice(0, 6).forEach((t) => add(broad, t));

    const seen = new Set();
    const take = (arr) => {
      const ok = [];
      for (const t of arr) {
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k); ok.push(t);
      }
      return ok;
    };
    const out = [...take(core).slice(0, 5), ...take(catTags).slice(0, 5), ...take(broad).slice(0, 5)];
    /* 중복으로 5개가 안 채워지면 남은 풀에서 채워 항상 15개 */
    const spare = [...core, ...catTags, ...broad, ...cat.tags.map((t) => `#${t}`), ...BROAD_TAGS.map((t) => `#${t}`)];
    for (const t of spare) {
      if (out.length >= TARGET_HASHTAGS) break;
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k); out.push(t);
    }
    return out.slice(0, TARGET_HASHTAGS);
  }

  function buildLocal(topic, styleHint, opts = {}) {
    const parsed = parseTopic(topic);
    if (!parsed.raw) return null;
    const style = styleOf(styleHint);
    const cat = detectCategory(parsed.text, style);
    const angle = cat.angles[hash(`${parsed.raw}|${style.id}`) % cat.angles.length];
    const price = parsePrice(parsed.raw);
    const hasPrice = !!price.text;
    const ctx = { ...parsed, brand: parsed.brandLabel, price: price.text, priceSale: price.sale };
    const cuts = clamp(Number(opts.cuts) || 5, 3, 8);
    const hookRaw = hasPrice && angle.hookPrice ? angle.hookPrice : angle.hook;
    const hook = fit(fill(hookRaw, ctx), 14);
    const titleRaw = parsed.hasCount && angle.titleCount ? angle.titleCount : angle.title;
    const title = fill(titleRaw, ctx).slice(0, 40);
    const scenes = buildScenes(angle, ctx, cuts);
    const caption = buildCaption(angle, ctx, plain(hook));
    const cta = fill(angle.cta, ctx);
    const tags = buildHashtags(parsed, cat, angle);
    const pick = (k, d) => (style[k] != null ? style[k] : (angle[k] != null ? angle[k] : (cat[k] != null ? cat[k] : d)));
    return {
      ok: true,
      source: 'local',
      p4: true,
      topic: parsed.raw,
      style: style.id,
      styleLabel: style.label,
      category: cat.id,
      categoryName: cat.name,
      cuts,
      hook,
      title,
      badge: fill(angle.badge, ctx).slice(0, 24),
      priceOrig: price.orig,
      priceSale: price.sale,
      priceText: price.text,
      scenes: scenes.map((s) => ({ top_label: s.top_label, sub: s.sub, voice: s.voice })),
      cta,
      caption,
      /* 이전 화면과의 호환 필드 */
      captions: scenes.map((s) => s.sub),
      instaCaption: caption,
      voiceScript: plain(fill(angle.voice.join(' '), ctx)),
      hashtags: tags.join(' '),
      hashtagList: tags,
      recommendedTemplateId: pick('templateId', 'info30'),
      recommendedSubtitleStyle: pick('subtitleStyle', 'outline'),
      recommendedBgm: pick('bgm', 'vlog'),
      recommendedFont: pick('font', 'pretendard'),
      recommendedAccent: pick('accent', 'lime'),
      recommendedWeight: pick('weight', 800),
      recommendedSpacing: pick('spacing', 0),
      disclosure: '※ 이 포스팅은 제휴 마케팅 활동의 일환으로 일정 수수료를 제공받습니다.',
      createdAt: Date.now(),
    };
  }

  /* ------------------------------------------------------------ OpenAI (선택) */
  function storedConfig() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch { return {}; }
  }
  function aiKey(explicit) {
    const typed = String(explicit == null ? '' : explicit).trim();
    if (typed) return typed;
    const cfg = storedConfig();
    if (cfg.provider && cfg.provider !== 'openai') return '';
    return String(cfg.key || '').trim();
  }
  const aiAvailable = (explicit) => !!aiKey(explicit);

  /* P4 프롬프트 — 키가 없는 사람이 그대로 복사해 GPT·클로드에 붙여넣는 용도이기도 합니다 */
  function buildP4Prompt(topic, styleHint, cutsIn) {
    const style = styleOf(styleHint);
    const cuts = clamp(Number(cutsIn) || 5, 3, 8);
    const t = String(topic == null ? '' : topic).trim();
    return [
      '너는 한국 인스타 릴스(9:16 · 12~20초) 카피라이터다. 아래 주제로 릴스 카피를 JSON 하나로만 출력해라.',
      '',
      `[주제] ${t || '(주제를 적어 주세요)'}`,
      `[스타일] ${style.label} — ${style.desc}`,
      `[컷 수] ${cuts}개`,
      '',
      '[규칙]',
      '1. hook: 14자 이내. 손해·반전·질문형 중 하나로.',
      `2. scenes: 정확히 ${cuts}개. 각 컷에 top_label(10자 이내), sub(16자 이내), voice(말하듯 자연스러운 한 문장).`,
      '3. cta: 저장·팔로우 유도 1줄.',
      '4. caption: 인스타 본문 3~4줄, 이모지 2~3개, 마지막 줄은 질문형.',
      '5. hashtags: 정확히 15개 = 주제 핵심 5 + 카테고리 5 + 넓은 태그 5. 각 "#태그" 형식.',
      '6. 가격·수량 같은 숫자는 주제에 명시된 경우에만 쓰고, 없으면 절대 지어내지 않는다.',
      '7. 과장·허위 효능·없는 판매량·수상 경력 금지. 직접 보지 않은 걸 본 것처럼 쓰지 않는다.',
      '8. badge는 24자 이내 상단 라벨. priceOrig·priceSale은 주제에 있을 때만 채운다.',
      `9. templateId는 ${TEMPLATE_IDS.join('|')} 중 하나, subtitleStyle은 ${STYLE_IDS.join('|')} 중 하나, bgm은 ${BGM_IDS.join('|')} 중 하나.`,
      '',
      '[출력 JSON]',
      '{',
      '  "hook": "", "badge": "", "priceOrig": "", "priceSale": "",',
      '  "scenes": [{ "top_label": "", "sub": "", "voice": "" }],',
      '  "cta": "", "caption": "", "hashtags": ["#태그"],',
      '  "templateId": "", "subtitleStyle": "", "bgm": ""',
      '}',
    ].join('\n');
  }

  function buildAIMessages(topic, style, cuts) {
    const system = [
      '너는 한국 인스타 릴스(9:16 숏폼) 카피라이터다.',
      '주어진 주제로 릴스 카피 JSON 하나만 출력한다.',
      '숫자(가격·수량·판매량·기간)는 주제에 적힌 것만 쓰고 절대 만들지 않는다.',
      '과장·허위 효능·없는 수상 경력 금지. JSON 외 설명 문장은 쓰지 않는다.',
    ].join(' ');
    return [{ role: 'system', content: system }, { role: 'user', content: buildP4Prompt(topic, style.id, cuts) }];
  }

  const str = (v, max, fallback) => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s ? s.slice(0, max) : fallback;
  };
  const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

  function normalizeAI(ai, base) {
    const o = ai && typeof ai === 'object' ? ai : {};
    const scenesIn = Array.isArray(o.scenes) ? o.scenes : [];
    const scenes = [];
    for (let i = 0; i < base.cuts; i += 1) {
      const s = scenesIn[i] || {};
      const bs = base.scenes[Math.min(i, base.scenes.length - 1)] || { top_label: '', sub: '', voice: '' };
      scenes.push({
        top_label: fit(str(s.top_label, 10, bs.top_label), 10),
        sub: fit(str(s.sub, 16, bs.sub), 16),
        voice: str(s.voice, 120, bs.voice),
      });
    }
    let tags = Array.isArray(o.hashtags) ? o.hashtags : (typeof o.hashtags === 'string' ? o.hashtags.split(/[\s,]+/) : []);
    tags = tags.map((t) => {
      const s = String(t == null ? '' : t).replace(/^#+/, '').replace(/[^0-9A-Za-z가-힣_]/g, '');
      return s ? `#${s}` : '';
    }).filter(Boolean);
    const seen = new Set();
    tags = tags.filter((t) => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    base.hashtagList.forEach((t) => {
      if (tags.length < TARGET_HASHTAGS && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) tags.push(t);
    });
    tags = tags.slice(0, TARGET_HASHTAGS);
    const subtitle = oneOf(o.subtitleStyle, STYLE_IDS, base.recommendedSubtitleStyle);
    return {
      ...base,
      source: 'ai',
      hook: fit(str(o.hook, 14, base.hook), 14),
      badge: str(o.badge, 24, base.badge),
      priceOrig: str(o.priceOrig, 12, base.priceOrig),
      priceSale: str(o.priceSale, 12, base.priceSale),
      priceText: (str(o.priceOrig, 12, '') && str(o.priceSale, 12, ''))
        ? `${str(o.priceOrig, 12, '')} → ${str(o.priceSale, 12, '')}`
        : (str(o.priceSale, 12, '') || base.priceText),
      scenes,
      captions: scenes.map((s) => s.sub),
      cta: str(o.cta, 80, base.cta),
      caption: str(o.caption, 1200, base.caption),
      instaCaption: str(o.caption, 1200, base.caption),
      voiceScript: scenes.map((s) => s.voice).filter(Boolean).join(' ') || base.voiceScript,
      hashtags: tags.join(' '),
      hashtagList: tags,
      recommendedTemplateId: oneOf(o.templateId, TEMPLATE_IDS, base.recommendedTemplateId),
      recommendedSubtitleStyle: subtitle,
      recommendedBgm: oneOf(o.bgm, BGM_IDS, base.recommendedBgm),
    };
  }

  async function generateAsync(topic, styleHint, opts = {}) {
    const base = buildLocal(topic, styleHint, opts);
    if (!base) return null;
    if (opts.ai === false) return base;
    const key = aiKey(opts.key);
    if (!key) return { ...base, aiSkipped: true };
    const style = styleOf(styleHint);
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: AI_MODEL,
          temperature: 0.8,
          response_format: { type: 'json_object' },
          messages: buildAIMessages(base.topic, style, base.cuts),
        }),
        signal: opts.signal,
      });
      if (!res.ok) {
        let detail = '';
        try { detail = (await res.text()).slice(0, 160); } catch { /* 무시 */ }
        throw new Error(`OpenAI 오류 ${res.status}${detail ? ` · ${detail}` : ''}`);
      }
      const data = await res.json();
      const raw = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      const parsed = JSON.parse(String(raw || '{}'));
      return { ...normalizeAI(parsed, base), aiModel: AI_MODEL };
    } catch (e) {
      const msg = String((e && e.message) || e || '');
      const friendly = /Failed to fetch|NetworkError|load failed/i.test(msg)
        ? 'OpenAI를 브라우저에서 직접 부르지 못했어요(키·CORS). 내장 생성기로 만들었습니다.'
        : `AI 생성 실패 · 내장 생성기로 만들었습니다 (${msg.slice(0, 120)})`;
      return { ...base, aiError: friendly };
    }
  }

  function buildCaptionText(out, withTags = true) {
    if (!out) return '';
    return [out.caption || out.instaCaption || '', withTags ? (out.hashtags || '') : ''].filter(Boolean).join('\n\n').trim();
  }

  window.Autogen = {
    version: '2026.11.21-p4',
    STYLES,
    CATEGORIES: CATS.map((c) => ({ id: c.id, name: c.name, keys: c.keys })),
    TEMPLATE_IDS,
    STYLE_IDS,
    BGM_IDS,
    FONT_IDS,
    ACCENT_IDS,
    TARGET_HASHTAGS,
    generate: buildLocal,
    generateAsync,
    parseTopic,
    parsePrice,
    buildHashtags,
    buildP4Prompt,
    buildAIMessages,
    normalizeAI,
    buildCaptionText,
    styleOf,
    aiAvailable,
    aiKey,
    storeKey: STORE_KEY,
    aiModel: AI_MODEL,
  };
})();
