import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Sparkles, Heart, Shield, User, Bot, RefreshCw, 
  ChevronRight, ChevronLeft, Star, Award, CheckCircle2, Smile, Frown, 
  Angry, AlertCircle, HelpCircle, ArrowLeft, Home, ShieldCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Message, AppScreen, Emotion, SavedAdvice, DailySituation, 
  CompletedSituation, Lesson, EmotionRecord, RewardRecord,
  TeacherState, Alert, StudentSummary, Student
} from './types';
import { sendMessage, evaluateSituationResponse, analyzeConversation } from './services/gemini';
import { generateMascot } from './services/imageGen';
import { Background } from './components/Background';
import { openShareSheet, openChat } from "zmp-sdk/apis";
import { 
  Bookmark, Trash2, X, Calendar, Trophy, SendHorizontal, 
  BookOpen, Users, MessageCircle, Share2, Info, BarChart3,
  TrendingUp, Activity, Copy, Link, MessageSquare, History
} from 'lucide-react';

const ENCOURAGEMENTS = [
  "Bobi hiểu cảm giác của em. 💛",
  "Em không hề đơn độc đâu. 😊",
  "Mình cùng nghĩ cách nhẹ nhàng nhé. ✨",
  "Nếu em muốn, mình sẽ đi từng bước với em. 🚀",
  "Bobi luôn ở đây lắng nghe em. 🌟",
  "Mọi chuyện rồi sẽ ổn thôi, cố lên nhé! 🌈",
  "Em thật mạnh mẽ khi chia sẻ điều này. 💪"
];

const EMOTIONS: Emotion[] = [
  { id: 'happy', label: 'Vui', emoji: '😊', color: '#FFD93D', bgColor: '#FFFDE7' },
  { id: 'sad', label: 'Buồn', emoji: '😢', color: '#4A90E2', bgColor: '#E3F2FD' },
  { id: 'angry', label: 'Giận', emoji: '😡', color: '#FF6B6B', bgColor: '#FFEBEE' },
  { id: 'worried', label: 'Lo', emoji: '😰', color: '#A29BFE', bgColor: '#F3E5F5' },
  { id: 'confused', label: 'Bối rối', emoji: '😵‍💫', color: '#FAB1A0', bgColor: '#FFF3E0' },
  { id: 'tired', label: 'Mệt', emoji: '😴', color: '#95A5A6', bgColor: '#F2F4F4' },
];

const MINI_LESSONS: Lesson[] = [
  // Cảm xúc
  {
    id: 'calm',
    category: 'Cảm xúc',
    title: 'Bình tĩnh khi giận',
    icon: '🧘',
    color: '#FF6B6B',
    imageSeed: 'meditation',
    content: [
      'Khi giận, tim mình đập nhanh và dễ nói điều không hay.',
      'Bạn có thể dừng lại một chút và hít thở sâu.',
      'Uống nước hoặc đi chỗ khác để bình tĩnh lại.',
      'Khi bình tĩnh, bạn sẽ chọn cách nói tốt hơn.'
    ],
    ending: 'Bạn làm được mà, chỉ cần chậm lại một chút thôi 💛'
  },
  {
    id: 'sad-what-to-do',
    category: 'Cảm xúc',
    title: 'Khi buồn nên làm gì',
    icon: '😢',
    color: '#4A90E2',
    imageSeed: 'sadness',
    content: [
      'Nỗi buồn giống như một cơn mưa nhỏ trong lòng.',
      'Bạn có thể khóc một chút nếu thấy nhẹ lòng hơn.',
      'Hãy thử vẽ một bức tranh hoặc nghe nhạc nhé.',
      'Kể cho ai đó nghe cũng giúp nỗi buồn vơi đi.'
    ],
    ending: 'Sau cơn mưa, cầu vồng sẽ lại hiện lên thôi 🌈'
  },
  {
    id: 'anxious',
    category: 'Cảm xúc',
    title: 'Khi cảm thấy lo lắng',
    icon: '😟',
    color: '#FF9F43',
    imageSeed: 'anxiety',
    content: [
      'Lo lắng là khi mình cứ nghĩ mãi về điều gì đó.',
      'Hãy thử đếm từ 1 đến 10 thật chậm rãi.',
      'Nắm chặt tay rồi thả lỏng ra vài lần nhé.',
      'Mọi chuyện rồi sẽ ổn thôi, bạn đừng quá lo.'
    ],
    ending: 'Hít một hơi thật sâu, bạn sẽ thấy ổn hơn 🌬️'
  },
  {
    id: 'scolded',
    category: 'Cảm xúc',
    title: 'Khi bị bố mẹ mắng',
    icon: '🏠',
    color: '#54a0ff',
    imageSeed: 'family-talk',
    content: [
      'Bố mẹ mắng vì muốn bạn tốt hơn và an toàn hơn.',
      'Hãy lắng nghe xem mình đã làm sai điều gì nhé.',
      'Đừng cãi lại lúc đang nóng giận, hãy im lặng.',
      'Khi cả hai bình tĩnh, hãy xin lỗi và sửa đổi.'
    ],
    ending: 'Bố mẹ luôn yêu bạn, dù đôi khi có nghiêm khắc 💖'
  },
  {
    id: 'jealous',
    category: 'Cảm xúc',
    title: 'Khi thấy ghen tị',
    icon: '😒',
    color: '#1dd1a1',
    imageSeed: 'green-envy',
    content: [
      'Ghen tị là khi mình muốn có thứ người khác có.',
      'Mỗi người đều có những điểm mạnh riêng biệt.',
      'Hãy nhìn lại những gì mình đang có và tự hào.',
      'Chúc mừng bạn khác cũng là cách mình vui hơn.'
    ],
    ending: 'Bạn là duy nhất và tuyệt vời theo cách riêng ✨'
  },
  {
    id: 'tired',
    category: 'Cảm xúc',
    title: 'Khi thấy mệt mỏi',
    icon: '😴',
    color: '#8395a7',
    imageSeed: 'rest',
    content: [
      'Cơ thể và tâm trí mình cũng cần được nghỉ ngơi.',
      'Hãy tạm dừng mọi việc và nằm xuống một chút.',
      'Một giấc ngủ ngắn hoặc ly nước mát sẽ giúp ích.',
      'Đừng ép bản thân quá sức, hãy lắng nghe cơ thể.'
    ],
    ending: 'Nghỉ ngơi một chút để nạp lại năng lượng nhé 🔋'
  },

  // Giao tiếp
  {
    id: 'sorry',
    category: 'Giao tiếp',
    title: 'Nói lời xin lỗi',
    icon: '🤝',
    color: '#4A90E2',
    imageSeed: 'apology',
    content: [
      'Ai cũng có lúc mắc lỗi, và nói lời xin lỗi là hành động rất dũng cảm.',
      'Hãy nhìn vào mắt bạn và nói "Mình xin lỗi nhé".',
      'Lời xin lỗi giúp vết thương trong lòng mau lành hơn.',
      'Sau đó, hãy cùng nhau tìm cách sửa lỗi nha.'
    ],
    ending: 'Lời xin lỗi chân thành là một phép màu đó ✨'
  },
  {
    id: 'listening',
    category: 'Giao tiếp',
    title: 'Lắng nghe người khác',
    icon: '👂',
    color: '#FF9800',
    imageSeed: 'listening',
    content: [
      'Lắng nghe là cách mình thể hiện sự quan tâm đến mọi người.',
      'Hãy im lặng một chút khi người khác đang nói nhé.',
      'Nhìn vào họ và gật đầu để họ biết bạn đang nghe.',
      'Bạn sẽ hiểu thêm nhiều điều thú vị từ bạn bè đó.'
    ],
    ending: 'Đôi tai biết lắng nghe là đôi tai tuyệt vời nhất 👂💖'
  },
  {
    id: 'confidence',
    category: 'Giao tiếp',
    title: 'Tự tin khi nói chuyện',
    icon: '🎤',
    color: '#A29BFE',
    imageSeed: 'confidence',
    content: [
      'Bạn có những ý tưởng rất hay, hãy mạnh dạn chia sẻ nhé.',
      'Hít một hơi thật sâu và nói to, rõ ràng từng câu.',
      'Đừng lo lắng nếu bạn thấy hơi run một chút.',
      'Mọi người đều muốn nghe những điều bạn nói đấy.'
    ],
    ending: 'Tiếng nói của bạn rất quan trọng, hãy tự tin lên 🎤🌟'
  },
  {
    id: 'thanks',
    category: 'Giao tiếp',
    title: 'Nói lời cảm ơn',
    icon: '🙏',
    color: '#ff9f43',
    imageSeed: 'thank-you',
    content: [
      'Lời cảm ơn làm cho người giúp đỡ bạn thấy hạnh phúc.',
      'Hãy nói "Cảm ơn" khi nhận được quà hoặc sự giúp đỡ.',
      'Cảm ơn cả những điều nhỏ bé hàng ngày nữa nhé.',
      'Lòng biết ơn giúp cuộc sống của mình đẹp hơn.'
    ],
    ending: 'Lời cảm ơn là món quà tinh thần vô giá 🎁'
  },
  {
    id: 'refuse',
    category: 'Giao tiếp',
    title: 'Cách từ chối khéo léo',
    icon: '🙅',
    color: '#ee5253',
    imageSeed: 'no-thanks',
    content: [
      'Đôi khi mình không thể làm điều người khác nhờ.',
      'Hãy nói "Mình xin lỗi, mình không làm được" thật nhẹ nhàng.',
      'Giải thích lý do ngắn gọn nếu bạn muốn nhé.',
      'Từ chối đúng lúc giúp bạn bảo vệ bản thân mình.'
    ],
    ending: 'Bạn có quyền nói "không" một cách lịch sự 🛡️'
  },
  {
    id: 'ask',
    category: 'Giao tiếp',
    title: 'Hỏi khi không biết',
    icon: '❓',
    color: '#0abde3',
    imageSeed: 'question',
    content: [
      'Không biết không có gì xấu, giấu giếm mới đáng lo.',
      'Đặt câu hỏi là cách nhanh nhất để học điều mới.',
      'Đừng ngại ngần, thầy cô và bạn bè luôn sẵn lòng.',
      'Mỗi câu hỏi là một cánh cửa mở ra kiến thức.'
    ],
    ending: 'Người hay hỏi là người thông minh nhất 🧠'
  },

  // Bạn bè
  {
    id: 'make-up',
    category: 'Bạn bè',
    title: 'Làm hòa với bạn',
    icon: '🌈',
    color: '#10ac84',
    imageSeed: 'friends-hug',
    content: [
      'Giận nhau là chuyện bình thường giữa những người bạn.',
      'Hãy là người chủ động mỉm cười trước nhé.',
      'Rủ bạn cùng chơi một trò chơi yêu thích xem sao.',
      'Tình bạn quý giá hơn những xích mích nhỏ nhặt.'
    ],
    ending: 'Tình bạn đẹp là khi biết tha thứ cho nhau 🤝'
  },
  {
    id: 'teased-lesson',
    category: 'Bạn bè',
    title: 'Khi bị bạn trêu',
    icon: '🛡️',
    color: '#576574',
    imageSeed: 'brave-child',
    content: [
      'Nếu bạn trêu chọc, hãy bình tĩnh và lờ đi nhé.',
      'Nói rõ ràng: "Mình không thích bạn làm thế đâu".',
      'Nếu vẫn tiếp tục, hãy đi chỗ khác hoặc tìm người lớn.',
      'Bạn rất tuyệt vời, lời trêu chọc không làm bạn xấu đi.'
    ],
    ending: 'Sự tự tin là tấm khiên bảo vệ bạn tốt nhất 💪'
  },
  {
    id: 'sharing',
    category: 'Bạn bè',
    title: 'Chia sẻ đồ chơi',
    icon: '🧸',
    color: '#ff6b6b',
    imageSeed: 'sharing-toys',
    content: [
      'Chơi cùng nhau luôn vui hơn là chơi một mình.',
      'Chia sẻ giúp bạn có thêm nhiều người bạn mới.',
      'Bạn có thể thay phiên nhau chơi từng món đồ.',
      'Đồ chơi được chia sẻ sẽ mang lại nhiều niềm vui hơn.'
    ],
    ending: 'Sẻ chia niềm vui, nhân đôi hạnh phúc 🌟'
  },
  {
    id: 'congrats',
    category: 'Bạn bè',
    title: 'Chúc mừng bạn',
    icon: '👏',
    color: '#feca57',
    imageSeed: 'celebration',
    content: [
      'Khi bạn mình đạt điểm cao hoặc làm được việc tốt.',
      'Hãy nở một nụ cười thật tươi và khen ngợi bạn.',
      'Niềm vui của bạn cũng có thể là niềm vui của mình.',
      'Sự chân thành giúp tình bạn thêm gắn bó.'
    ],
    ending: 'Biết vui cùng người khác là một tâm hồn đẹp 💖'
  },
  {
    id: 'helping-friends',
    category: 'Bạn bè',
    title: 'Giúp đỡ bạn bè',
    icon: '🆘',
    color: '#48dbfb',
    imageSeed: 'helping-hand',
    content: [
      'Khi thấy bạn gặp khó khăn, hãy hỏi: "Mình giúp gì được không?".',
      'Một hành động nhỏ cũng có thể giúp bạn rất nhiều.',
      'Giúp bạn học bài hoặc nhặt giúp đồ bị rơi.',
      'Lòng tốt sẽ lan tỏa và quay lại với bạn đấy.'
    ],
    ending: 'Giúp người là giúp mình thấy vui hơn 🤝'
  },

  // Gia đình
  {
    id: 'helping-mom',
    category: 'Gia đình',
    title: 'Giúp mẹ việc nhà',
    icon: '🧹',
    color: '#ff9ff3',
    imageSeed: 'cleaning',
    content: [
      'Mẹ đã vất vả cả ngày để chăm sóc gia đình mình.',
      'Bạn có thể giúp mẹ dọn đồ chơi hoặc lau bàn.',
      'Những việc nhỏ của bạn là niềm vui lớn của mẹ.',
      'Gia đình là nơi mọi người cùng nhau chia sẻ.'
    ],
    ending: 'Bàn tay nhỏ làm việc nhỏ, giúp mẹ vui lòng 🏠'
  },
  {
    id: 'love-parents',
    category: 'Gia đình',
    title: 'Nói yêu thương bố mẹ',
    icon: '❤️',
    color: '#ff6b6b',
    imageSeed: 'family-hug',
    content: [
      'Đừng ngại ngần nói "Con yêu bố mẹ" mỗi ngày nhé.',
      'Một cái ôm thật chặt cũng thay cho ngàn lời nói.',
      'Bố mẹ sẽ thấy rất ấm áp khi nghe lời yêu thương.',
      'Tình yêu là sợi dây gắn kết gia đình bền chặt.'
    ],
    ending: 'Yêu thương cần được nói ra và thể hiện 💖'
  },
  {
    id: 'new-baby',
    category: 'Gia đình',
    title: 'Khi có em bé mới',
    icon: '👶',
    color: '#48dbfb',
    imageSeed: 'baby',
    content: [
      'Em bé mới là một thành viên đáng yêu của gia đình.',
      'Bố mẹ có thể bận rộn hơn nhưng vẫn rất yêu bạn.',
      'Hãy thử giúp bố mẹ lấy tã hoặc chơi cùng em nhé.',
      'Làm anh/chị là một trải nghiệm rất thú vị đấy.'
    ],
    ending: 'Bạn là người anh/chị tuyệt vời nhất thế giới 🥇'
  },
  {
    id: 'family-meal',
    category: 'Gia đình',
    title: 'Ăn cơm cùng gia đình',
    icon: '🍲',
    color: '#feca57',
    imageSeed: 'family-dinner',
    content: [
      'Bữa cơm là lúc cả nhà quây quản bên nhau.',
      'Hãy giúp bố mẹ dọn bát đũa ra bàn ăn nhé.',
      'Kể cho cả nhà nghe những chuyện vui ở trường.',
      'Ăn uống ngon miệng và không nghịch điện thoại.'
    ],
    ending: 'Bữa cơm gia đình là nơi ấm áp nhất 🏠🍲'
  },

  // Bản thân
  {
    id: 'mistakes',
    category: 'Bản thân',
    title: 'Không sợ mắc lỗi',
    icon: '🌱',
    color: '#4CAF50',
    imageSeed: 'growth',
    content: [
      'Mắc lỗi không phải là điều xấu, đó là cách chúng mình học hỏi.',
      'Mỗi lần sai là một lần mình biết thêm một điều mới.',
      'Đừng buồn nhé, hãy thử lại lần nữa xem sao.',
      'Bobi luôn tin tưởng vào sự cố gắng của bạn.'
    ],
    ending: 'Cứ tự tin thử sức, bạn đang giỏi lên từng ngày 🚀'
  },
  {
    id: 'focus',
    category: 'Bản thân',
    title: 'Tập trung khi học',
    icon: '📚',
    color: '#54a0ff',
    imageSeed: 'studying',
    content: [
      'Khi học, hãy cất bớt những đồ chơi gây xao nhãng.',
      'Ngồi ngay ngắn và tập trung vào bài tập trước mắt.',
      'Học xong sớm, bạn sẽ có nhiều thời gian chơi hơn.',
      'Sự tập trung giúp bạn hiểu bài nhanh và sâu hơn.'
    ],
    ending: 'Tập trung là chìa khóa của sự thông minh 🔑'
  },
  {
    id: 'try-again',
    category: 'Bản thân',
    title: 'Dám thử lại lần nữa',
    icon: '🔄',
    color: '#1dd1a1',
    imageSeed: 'persistence',
    content: [
      'Thất bại một lần không có nghĩa là bạn không giỏi.',
      'Những người thành công đều đã từng thử lại rất nhiều lần.',
      'Hãy xem mình có thể làm khác đi ở đâu nhé.',
      'Sự kiên trì sẽ đưa bạn đến đích cuối cùng.'
    ],
    ending: 'Mỗi lần thử lại là một lần bạn mạnh mẽ hơn 💪'
  },
  {
    id: 'self-care',
    category: 'Bản thân',
    title: 'Tự chăm sóc bản thân',
    icon: '🧼',
    color: '#0abde3',
    imageSeed: 'hygiene',
    content: [
      'Đánh răng, rửa mặt và tắm rửa sạch sẽ mỗi ngày.',
      'Mặc quần áo gọn gàng giúp bạn thấy tự tin hơn.',
      'Ăn nhiều rau xanh và hoa quả để cơ thể khỏe mạnh.',
      'Yêu thương bản thân bắt đầu từ những việc nhỏ nhất.'
    ],
    ending: 'Cơ thể khỏe mạnh là ngôi nhà của tâm hồn vui 🏠✨'
  },
  {
    id: 'tidy',
    category: 'Bản thân',
    title: 'Sắp xếp đồ ngăn nắp',
    icon: '📦',
    color: '#8395a7',
    imageSeed: 'organized',
    content: [
      'Chơi xong hãy cất đồ chơi về đúng chỗ cũ nhé.',
      'Sách vở ngăn nắp giúp bạn tìm kiếm dễ dàng hơn.',
      'Góc học tập sạch đẹp sẽ tạo cảm hứng học tập.',
      'Gọn gàng là một thói quen rất tốt của người lớn.'
    ],
    ending: 'Ngăn nắp giúp cuộc sống của bạn nhẹ nhàng hơn ✨'
  },
  {
    id: 'sleep',
    category: 'Bản thân',
    title: 'Ngủ đúng giờ',
    icon: '🌙',
    color: '#5f27cd',
    imageSeed: 'sleepy',
    content: [
      'Giấc ngủ giúp não bộ và cơ thể bạn phát triển.',
      'Hãy đi ngủ sớm để sáng mai thức dậy thật tỉnh táo.',
      'Tránh xem tivi hay điện thoại trước khi ngủ nhé.',
      'Chúc bạn có những giấc mơ thật đẹp và êm đềm.'
    ],
    ending: 'Ngủ ngon để ngày mai là một ngày tuyệt vời 😴🌟'
  }
];

const DAILY_SITUATIONS: DailySituation[] = [
  { id: '1', topic: 'Bị trêu chọc', text: 'Bạn bị một bạn trong lớp trêu chọc về bộ quần áo mới. Bạn sẽ làm gì?' },
  { id: '2', topic: 'Lười học', text: 'Hôm nay bạn thấy hơi lười và không muốn làm bài tập về nhà. Bạn sẽ làm gì để vượt qua cảm giác này?' },
  { id: '3', topic: 'Cãi nhau với bạn', text: 'Bạn và người bạn thân nhất vừa cãi nhau vì một món đồ chơi. Bạn sẽ làm gì để làm hòa?' },
  { id: '4', topic: 'Bị bỏ rơi', text: 'Giờ ra chơi, các bạn khác đang chơi đá cầu nhưng không rủ bạn chơi cùng. Bạn sẽ làm gì?' },
  { id: '5', topic: 'Xung đột nhỏ', text: 'Em trai vô tình làm hỏng bức tranh bạn vừa vẽ xong. Bạn đang thấy rất giận, bạn sẽ làm gì?' },
];

const EMOTION_SUGGESTIONS: Record<string, string[]> = {
  happy: [
    "Em muốn chia sẻ niềm vui 😊",
    "Em vừa làm được điều gì đó 🎉",
    "Em muốn kể chuyện vui 😄",
    "Em cảm thấy rất tự tin 💪"
  ],
  sad: [
    "Em đang buồn 😢",
    "Không ai chơi với em",
    "Em thấy cô đơn",
    "Em muốn được lắng nghe"
  ],
  angry: [
    "Em đang rất giận 😡",
    "Có người làm em khó chịu",
    "Em muốn nói ra nhưng sợ",
    "Em không biết làm sao cho hết giận"
  ],
  worried: [
    "Em đang lo 😰",
    "Em sợ làm sai",
    "Em không tự tin",
    "Em không biết phải làm sao"
  ],
  confused: [
    "Em không biết nên làm gì",
    "Em đang rối quá 😵‍💫",
    "Em cần giúp",
    "Em không hiểu chuyện này"
  ],
  tired: [
    "Em thấy mệt 😴",
    "Em không muốn làm gì",
    "Em muốn nghỉ",
    "Em bị quá tải"
  ]
};

const DEFAULT_SUGGESTIONS = [
  "Em đang buồn",
  "Em bị bạn trêu",
  "Em không muốn học",
  "Em giận ai đó"
];

const HomeButton = ({ onClick }: { onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-2xl shadow-sm border border-[#E5E5D5] transition-all active:scale-95 group"
  >
    <Home className="w-5 h-5 text-[#5A5A40] group-hover:scale-110 transition-transform" />
    <span className="text-sm font-bold text-[#5A5A40]">Trang chủ</span>
  </button>
);

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('onboarding');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [mascotUrl, setMascotUrl] = useState<string | null>(null);
  const [savedAdvices, setSavedAdvices] = useState<SavedAdvice[]>([]);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [completedSituations, setCompletedSituations] = useState<CompletedSituation[]>([]);
  const [emotionRecords, setEmotionRecords] = useState<EmotionRecord[]>([]);
  const [rewardRecords, setRewardRecords] = useState<RewardRecord[]>([]);
  const [totalStars, setTotalStars] = useState(0);
  const [showStarAnimation, setShowStarAnimation] = useState(0);
  const [currentSituation, setCurrentSituation] = useState<DailySituation | null>(null);
  const [dailyAnswer, setDailyAnswer] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<{ feedback: string, stars: number, evaluation: string } | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isGeneratingMascot, setIsGeneratingMascot] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [lastShareMethod, setLastShareMethod] = useState<string>(() => localStorage.getItem('lastShareMethod') || '');
  const [shareData, setShareData] = useState({ text: '', url: window.location.href });
  
  const [teacherState, setTeacherState] = useState<TeacherState>({ alerts: [], summaries: [], students: [] });
  const [teacherAccessCount, setTeacherAccessCount] = useState(0);
  const [teacherView, setTeacherView] = useState<'overview' | 'student-list' | 'student-detail'>('overview');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const TEACHER_PIN = '1234';

  // Zalo IDs for school and parent
  const [parentZaloUserId] = useState<string | null>(null); // Mock: null or real parent ID
  const [schoolOaId] = useState<string | null>("38241234567890"); // Mock: School OA ID
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shareToast) {
      const timer = setTimeout(() => setShareToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [shareToast]);

  const getChartData = (days: number, studentId?: string) => {
    const targetRecords = studentId 
      ? teacherState.students.find(s => s.id === studentId)?.emotionRecords || []
      : emotionRecords;

    const cutoff = subDays(new Date(), days);
    const recentRecords = targetRecords.filter(r => {
      const [day, month, year] = r.date.split('/');
      const recordDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return recordDate >= cutoff;
    });

    const counts = EMOTIONS.map(e => ({
      name: e.label,
      count: recentRecords.filter(r => r.emotionId === e.id).length,
      color: e.color,
      emoji: e.emoji
    }));

    return counts.filter(c => c.count > 0);
  };

  const getEmotionSummary = () => {
    const last7Days = getChartData(7);
    const total = last7Days.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return "Bobi đang chờ nghe cảm xúc của em đó! 😊";

    const positiveCount = last7Days.filter(item => item.name === 'Vui vẻ').reduce((sum, item) => sum + item.count, 0);
    const difficultCount = total - positiveCount;

    if (positiveCount > difficultCount) {
      return "Tuần này em có thật nhiều niềm vui, Bobi rất mừng cho em! 😊🌟";
    } else if (difficultCount > positiveCount) {
      return "Có vẻ tuần này em hơi mệt mỏi hoặc lo lắng một chút. Đừng quên Bobi luôn ở đây lắng nghe em nhé! 💛🧸";
    } else {
      return "Tuần này em có cả những lúc vui và những lúc cần chia sẻ. Em thật giỏi khi đã vượt qua tất cả! 💪✨";
    }
  };

  const isZaloMiniApp = () => {
    try {
      return typeof window !== 'undefined' && (window as any).ZaloMiniApp;
    } catch (e) {
      return false;
    }
  };

  const openParentChat = async (message: string) => {
    if (!parentZaloUserId) return false;
    try {
      await openChat({
        type: "user",
        id: parentZaloUserId,
        message: message
      });
      return true;
    } catch (err) {
      console.error("Failed to open parent chat:", err);
      return false;
    }
  };

  const openOAChat = async (message: string) => {
    if (!schoolOaId) return false;
    try {
      await openChat({
        type: "oa",
        id: schoolOaId,
        message: message
      });
      return true;
    } catch (err) {
      console.error("Failed to open OA chat:", err);
      return false;
    }
  };

  const fallbackCopyShare = (message: string, toastMsg?: string) => {
    navigator.clipboard.writeText(message);
    setShareToast(toastMsg || "Đã sao chép. Ba mẹ chỉ cần dán vào Zalo để gửi.");
  };

  const handleShare = async (method: string) => {
    setLastShareMethod(method);
    localStorage.setItem('lastShareMethod', method);
    
    const encodedText = encodeURIComponent(shareData.text);
    const encodedUrl = encodeURIComponent(shareData.url);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    switch (method) {
      case 'zalo':
        const message = shareData.text;
        if (isZaloMiniApp()) {
          if (parentZaloUserId) {
            await openParentChat(message);
          } else if (schoolOaId) {
            setShareToast("Chưa liên kết Zalo của phụ huynh. Bobi sẽ mở kênh Zalo của trường trước nhé.");
            await openOAChat(message);
          } else {
            try {
              await openShareSheet({
                type: "text",
                data: { text: message }
              });
            } catch (err) {
              fallbackCopyShare(message, "Bobi chưa mở được Zalo, mình đã sao chép nội dung giúp em rồi nhé.");
            }
          }
        } else {
          if (schoolOaId) {
            window.open(`https://zalo.me/${schoolOaId}`, '_blank');
            fallbackCopyShare(message, "Đã sao chép. Ba mẹ chỉ cần dán vào Zalo vừa mở để gửi.");
          } else {
            fallbackCopyShare(message);
          }
        }
        break;
      case 'messenger':
        // Messenger doesn't support direct text sharing via URL easily, 
        // so we share the link or use the sharer fallback
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(shareData.text);
        setShareToast("📋 Đã sao chép rồi nhé!");
        break;
      case 'link':
        navigator.clipboard.writeText(shareData.url);
        setShareToast("🔗 Đã sao chép link rồi nhé!");
        break;
    }
    setIsShareModalOpen(false);
  };

  const openShareModal = (text: string) => {
    setShareData(prev => ({ ...prev, text }));
    setIsShareModalOpen(true);
  };
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Load data from localStorage
  useEffect(() => {
    const storedAdvices = localStorage.getItem('saved_advices');
    if (storedAdvices) {
      try {
        const parsed = JSON.parse(storedAdvices);
        setSavedAdvices(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (e) { console.error(e); }
    }

    const storedJourney = localStorage.getItem('completed_situations');
    if (storedJourney) {
      try {
        setCompletedSituations(JSON.parse(storedJourney));
      } catch (e) { console.error(e); }
    }

    const storedRecords = localStorage.getItem('emotion_records');
    if (storedRecords) {
      try {
        setEmotionRecords(JSON.parse(storedRecords));
      } catch (e) { console.error(e); }
    }

    const storedRewards = localStorage.getItem('reward_records');
    if (storedRewards) {
      try {
        setRewardRecords(JSON.parse(storedRewards));
      } catch (e) { console.error(e); }
    }

    const storedTotalStars = localStorage.getItem('total_stars');
    if (storedTotalStars) setTotalStars(parseInt(storedTotalStars));

    const storedTeacherState = localStorage.getItem('teacher_state');
    if (storedTeacherState) {
      try {
        const parsed = JSON.parse(storedTeacherState);
        if (!parsed.students) parsed.students = [];
        setTeacherState(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  // Initialize mock students if empty
  useEffect(() => {
    if (teacherState.students.length === 0) {
      const mockStudents: Student[] = [
        {
          id: 'current-user',
          name: 'Nguyễn Văn An (Em)',
          supportLevel: 'Ổn định',
          frequentEmotion: 'Vui',
          totalStars: totalStars,
          lastActivity: format(new Date(), 'dd/MM/yyyy'),
          emotionRecords: emotionRecords,
          completedSituations: completedSituations,
          alerts: teacherState.alerts,
          summaries: teacherState.summaries
        },
        {
          id: 'student-2',
          name: 'Trần Thị Bình',
          supportLevel: 'Cần chú ý',
          frequentEmotion: 'Buồn',
          totalStars: 12,
          lastActivity: '27/03/2026',
          emotionRecords: [],
          completedSituations: [],
          alerts: [
            { id: 'a1', type: 'sadness', message: 'Bé buồn bã liên tục 3 ngày qua', timestamp: new Date(), suggestions: ['Hỏi thăm nhẹ nhàng', 'Trao đổi với phụ huynh'] }
          ],
          summaries: [{ id: 's1', date: '27/03', summary: 'Bé có vẻ lo lắng về bài kiểm tra sắp tới.', keywords: ['lo lắng', 'bài tập'] }]
        },
        {
          id: 'student-3',
          name: 'Lê Văn Cường',
          supportLevel: 'Ổn định',
          frequentEmotion: 'Vui',
          totalStars: 45,
          lastActivity: '28/03/2026',
          emotionRecords: [],
          completedSituations: [],
          alerts: [],
          summaries: []
        },
        {
          id: 'student-4',
          name: 'Phạm Minh Đức',
          supportLevel: 'Cần hỗ trợ ngay',
          frequentEmotion: 'Giận',
          totalStars: 5,
          lastActivity: '26/03/2026',
          emotionRecords: [],
          completedSituations: [],
          alerts: [
            { id: 'a2', type: 'anger', message: 'Tần suất giận dữ tăng cao đột ngột', timestamp: new Date(), suggestions: ['Quan sát trong giờ chơi', 'Tổ chức hoạt động nhóm'] }
          ],
          summaries: []
        }
      ];
      setTeacherState(prev => ({ ...prev, students: mockStudents }));
    }
  }, [teacherState.students.length, totalStars, emotionRecords, completedSituations, teacherState.alerts, teacherState.summaries]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('teacher_state', JSON.stringify(teacherState));
  }, [teacherState]);

  useEffect(() => {
    localStorage.setItem('saved_advices', JSON.stringify(savedAdvices));
  }, [savedAdvices]);

  useEffect(() => {
    localStorage.setItem('completed_situations', JSON.stringify(completedSituations));
  }, [completedSituations]);

  useEffect(() => {
    localStorage.setItem('emotion_records', JSON.stringify(emotionRecords));
  }, [emotionRecords]);

  useEffect(() => {
    localStorage.setItem('reward_records', JSON.stringify(rewardRecords));
  }, [rewardRecords]);

  useEffect(() => {
    localStorage.setItem('total_stars', totalStars.toString());
  }, [totalStars]);

  // Background Teacher Support Logic
  useEffect(() => {
    const checkAlerts = () => {
      const newAlerts: Alert[] = [];
      const now = new Date();
      const today = now.toLocaleDateString('vi-VN');

      // 1. Sadness for 3+ days
      const last7Days = getChartData(7);
      const sadCount = last7Days.find(c => c.name === 'Buồn bã')?.count || 0;
      if (sadCount >= 3) {
        newAlerts.push({
          id: `sad-${today}`,
          type: 'sadness',
          message: 'Học sinh đang có nhiều cảm xúc buồn trong những ngày gần đây',
          timestamp: now,
          suggestions: [
            'Bạn có thể hỏi nhẹ: "Hôm nay con ổn không?"',
            'Hãy tạo cơ hội để học sinh chia sẻ riêng',
            'Quan sát thêm trong lớp học'
          ]
        });
      }

      // 2. High anger
      const angryCount = last7Days.find(c => c.name === 'Giận dữ')?.count || 0;
      if (angryCount >= 3) {
        newAlerts.push({
          id: `angry-${today}`,
          type: 'anger',
          message: 'Học sinh thường xuyên cảm thấy giận dữ trong tuần qua',
          timestamp: now,
          suggestions: [
            'Tìm hiểu nguyên nhân gây ra sự giận dữ',
            'Hướng dẫn học sinh các kỹ thuật bình tĩnh',
            'Trao đổi với phụ huynh về các tình huống ở nhà'
          ]
        });
      }

      // 3. Continuous tiredness
      const tiredCount = last7Days.find(c => c.name === 'Mệt mỏi')?.count || 0;
      if (tiredCount >= 3) {
        newAlerts.push({
          id: `tired-${today}`,
          type: 'tiredness',
          message: 'Học sinh có dấu hiệu mệt mỏi kéo dài',
          timestamp: now,
          suggestions: [
            'Kiểm tra xem học sinh có bị thiếu ngủ hay áp lực học tập không',
            'Khuyến khích học sinh nghỉ ngơi hợp lý',
            'Trao đổi với phụ huynh về sức khỏe của bé'
          ]
        });
      }

      if (newAlerts.length > 0) {
        setTeacherState(prev => {
          const existingIds = new Set(prev.alerts.map(a => a.id));
          const uniqueNewAlerts = newAlerts.filter(a => !existingIds.has(a.id));
          if (uniqueNewAlerts.length === 0) return prev;
          return {
            ...prev,
            alerts: [...uniqueNewAlerts, ...prev.alerts].slice(0, 50)
          };
        });
      }
    };

    if (emotionRecords.length > 0) {
      checkAlerts();
    }
  }, [emotionRecords]);

  useEffect(() => {
    const analyzeChat = async () => {
      // Analyze every 10 messages
      if (messages.length >= 10 && messages.length % 10 === 0) {
        const analysis = await analyzeConversation(messages.slice(-10));
        const today = new Date().toLocaleDateString('vi-VN');
        
        setTeacherState(prev => {
          const newSummary: StudentSummary = {
            id: Date.now().toString(),
            date: today,
            summary: analysis.summary,
            keywords: analysis.keywords
          };
          return {
            ...prev,
            summaries: [newSummary, ...prev.summaries].slice(0, 20)
          };
        });
      }
    };
    analyzeChat();
  }, [messages]);

  const handleTeacherAccess = () => {
    setTeacherAccessCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setScreen('teacher-dashboard');
        return 0;
      }
      return next;
    });
  };

  useEffect(() => {
    localStorage.setItem('emotion_records', JSON.stringify(emotionRecords));
  }, [emotionRecords]);

  const scrollToBottom = (force = false) => {
    if (force || isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleChatScroll = (e: React.UIEvent<HTMLElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // If we are within 100px of the bottom, consider it "at bottom"
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);
  };

  useEffect(() => {
    if (screen === 'chat' && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Force scroll if user just sent a message
      // Otherwise only scroll if already at bottom
      scrollToBottom(lastMessage.role === 'user');
    } else if (screen === 'chat') {
      // Force scroll when entering chat screen
      scrollToBottom(true);
    }
  }, [messages, screen]);

  useEffect(() => {
    const loadAssets = async () => {
      setIsGeneratingMascot(true);
      const mascot = await generateMascot();
      setMascotUrl(mascot);
      setIsGeneratingMascot(false);
    };
    loadAssets();
  }, []);

  const startApp = () => setScreen('emotion');

  const startDailySituation = () => {
    // Pick a random situation that hasn't been completed today if possible
    const today = new Date().toLocaleDateString('vi-VN');
    const completedToday = completedSituations.filter(s => s.date === today);
    
    // For simplicity, just pick a random one for now
    const available = DAILY_SITUATIONS.filter(s => !completedToday.find(c => c.id === s.id));
    const next = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : DAILY_SITUATIONS[Math.floor(Math.random() * DAILY_SITUATIONS.length)];
    
    setCurrentSituation(next);
    setDailyAnswer('');
    setEvaluationResult(null);
    setScreen('daily-situation');
  };

  const submitDailyAnswer = async () => {
    if (!currentSituation || !dailyAnswer.trim() || isLoading) return;
    
    setIsLoading(true);
    const result = await evaluateSituationResponse(currentSituation.text, dailyAnswer);
    setEvaluationResult(result);
    setIsLoading(false);
    
    // Save to journey
    const completed: CompletedSituation = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('vi-VN'),
      situation: currentSituation.text,
      userAnswer: dailyAnswer,
      aiFeedback: result.feedback,
      stars: result.stars
    };
    
    setCompletedSituations(prev => [completed, ...prev]);
    awardStars(result.stars, 'situation');
  };

  const saveAdvice = (message: Message) => {
    if (savedAdvices.find(a => a.id === message.id)) return;

    const title = message.text.split('\n')[0].substring(0, 40) + '...';
    const newAdvice: SavedAdvice = {
      id: message.id,
      title: title,
      text: message.text,
      timestamp: new Date()
    };

    setSavedAdvices(prev => [newAdvice, ...prev]);
    
    // Also save to journey as requested
    const journeyEntry: CompletedSituation = {
      id: `advice-${message.id}`,
      date: new Date().toLocaleDateString('vi-VN'),
      situation: "Lời khuyên từ Bobi 💎",
      userAnswer: "Em đã trò chuyện và lưu lại lời khuyên này",
      aiFeedback: message.text,
      stars: message.starsEarned || 1
    };
    setCompletedSituations(prev => [journeyEntry, ...prev]);

    setSaveFeedback(message.id);
    setTimeout(() => setSaveFeedback(null), 3000);
    
    // Update message state to show it's saved
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, isSaved: true } : m));
  };

  const deleteAdvice = (id: string) => {
    setSavedAdvices(prev => prev.filter(a => a.id !== id));
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isSaved: false } : m));
  };

  const selectEmotion = (emotion: Emotion) => {
    setSelectedEmotion(emotion);
    
    // Record emotion
    const now = new Date();
    const newRecord: EmotionRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: now.toLocaleDateString('vi-VN'),
      time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      emotionId: emotion.id,
      emoji: emotion.emoji,
      label: emotion.label
    };
    
    // Save full history
    setEmotionRecords(prev => [newRecord, ...prev]);

    let welcomeText = "";
    switch (emotion.id) {
      case 'happy':
        welcomeText = `Chào bạn nhỏ! Mình thấy bạn đang rất vui ${emotion.emoji}. Thật tuyệt quá! Bạn muốn chia sẻ niềm vui đó với mình không?`;
        break;
      case 'sad':
        welcomeText = `Chào bạn nhỏ! Mình thấy bạn đang cảm thấy ${emotion.label.toLowerCase()} ${emotion.emoji}. Đừng lo nhé, mình luôn ở đây để lắng nghe bạn. Bạn muốn kể cho mình nghe chuyện gì không?`;
        break;
      case 'angry':
        welcomeText = `Chào bạn nhỏ! Mình thấy bạn đang hơi giận một chút ${emotion.emoji}. Hít một hơi thật sâu cùng mình nhé. Bạn muốn kể cho mình nghe điều gì đã làm bạn không vui không?`;
        break;
      case 'worried':
        welcomeText = `Chào bạn nhỏ! Mình thấy bạn đang lo lắng ${emotion.emoji}. Đừng lo nhé, mình sẽ cùng bạn tìm cách giải quyết. Bạn muốn chia sẻ điều gì đang làm bạn bận tâm không?`;
        break;
      case 'confused':
        welcomeText = `Chào bạn nhỏ! Có vẻ như bạn đang thấy hơi bối rối ${emotion.emoji}. Không sao đâu, mình cùng nhau gỡ rối nhé. Chuyện gì đang xảy ra vậy bạn?`;
        break;
      case 'tired':
        welcomeText = `Chào bạn nhỏ! Bạn đang thấy mệt mỏi đúng không ${emotion.emoji}? Hãy nghỉ ngơi một chút nhé. Nếu bạn muốn tâm sự cho nhẹ lòng, mình luôn ở đây.`;
        break;
      default:
        welcomeText = `Chào bạn nhỏ! Mình thấy bạn đang cảm thấy ${emotion.label.toLowerCase()} ${emotion.emoji}. Mình luôn ở đây để lắng nghe bạn. Bạn muốn kể cho mình nghe chuyện gì không?`;
    }

    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: welcomeText,
        timestamp: new Date(),
        type: 'greeting'
      }
    ]);
    setScreen('chat');
  };

  const awardStars = (amount: number, type: 'chat' | 'situation') => {
    const today = new Date().toLocaleDateString('vi-VN');
    const newRecord: RewardRecord = {
      date: today,
      stars: amount,
      type
    };
    setRewardRecords(prev => [newRecord, ...prev]);
    setTotalStars(prev => prev + amount);
    setShowStarAnimation(amount);
    setTimeout(() => setShowStarAnimation(0), 3000);
  };

  const handleSend = async (text: string = input) => {
    const messageText = text.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const response = await sendMessage(messageText);
    
    // Parse steps if any (look for bullet points or numbered lines)
    const stepsMatch = response.match(/^[-*•\d.]\s([^\n]+)/gm);
    const steps = stepsMatch ? stepsMatch.map(s => s.replace(/^[-*•\d.]\s/, '')) : undefined;

    // Determine if this is an advice message
    // Advice usually has bullets, numbered lists, or is relatively long
    const hasAdvice = !!steps || response.length > 100 || response.includes('\n') || response.includes('?') || response.includes(':');

    // Determine stars for chat (1-2 based on length/complexity)
    const stars = messageText.length > 20 ? 2 : 1;

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response || 'Mình đang suy nghĩ một chút...',
      timestamp: new Date(),
      isActionCard: !!steps,
      hasAdvice: hasAdvice,
      steps: steps,
      starsEarned: stars,
      type: 'advice'
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsLoading(false);
    awardStars(stars, 'chat');

    // If it's an action card, maybe show reward screen after a delay or interaction
    if (steps) {
      setTimeout(() => {
        // In a real app, we'd wait for user to complete steps
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderOnboarding = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto bg-[#FDFCF0]"
    >
      <div className="max-w-md w-full flex flex-col items-center">
        {/* 1. App Name */}
        <span className="text-xl font-black uppercase tracking-[0.15em] text-[#A29BFE] mb-4">
          Gỡ rối cùng em
        </span>

        {/* 2. Avatar Bobi */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 overflow-hidden border-4 border-white"
        >
          {mascotUrl ? (
            <img 
              src={mascotUrl} 
              alt="Bobi Mascot" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          ) : isGeneratingMascot ? (
            <RefreshCw className="w-8 h-8 text-[#4A90E2] animate-spin" />
          ) : (
            <div className="flex flex-col items-center text-[#4A90E2]">
              <Bot className="w-12 h-12" />
            </div>
          )}
        </motion.div>
        
        {/* 3. Tiêu đề + mô tả */}
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-[#5A5A40]">Chào bạn nhỏ! 👋</h1>
          <h2 className="text-xl font-semibold text-[#5A5A40]">Mình là Bobi đây 😊</h2>
          <p className="text-base text-[#8E8E80] leading-relaxed max-w-[280px] mx-auto">
            Nếu hôm nay bạn đang buồn, giận hay rối một chút, cứ kể mình nghe nha!
          </p>
        </div>
        
        {/* 3. Primary Button (QUAN TRỌNG NHẤT) */}
        <div className="w-full mb-8">
          <button
            onClick={startApp}
            className="w-full group flex items-center justify-center gap-3 bg-gradient-to-r from-[#FFD93D] to-[#FFC233] text-[#8B7E00] py-5 rounded-2xl text-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-95"
          >
            Bắt đầu <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 4. Secondary Actions (Grid 2x2) */}
        <div className="grid grid-cols-2 gap-4 w-full">
          <button
            onClick={startDailySituation}
            className="flex flex-col items-center justify-center gap-2 bg-[#E3F2FD] text-[#1976D2] p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 border border-[#BBDEFB]"
          >
            <Calendar className="w-6 h-6" />
            <span className="text-sm font-bold leading-tight">Tình huống mỗi ngày</span>
          </button>
          
          <button
            onClick={() => setScreen('lessons')}
            className="flex flex-col items-center justify-center gap-2 bg-[#E8F5E9] text-[#2E7D32] p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 border border-[#C8E6C9]"
          >
            <BookOpen className="w-6 h-6" />
            <span className="text-sm font-bold leading-tight">Bài học mini</span>
          </button>

          <button
            onClick={() => setScreen('parent-connect')}
            className="flex flex-col items-center justify-center gap-2 bg-[#F3E5F5] text-[#7B1FA2] p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 border border-[#E1BEE7]"
          >
            <Users className="w-6 h-6" />
            <span className="text-sm font-bold leading-tight">Kết nối phụ huynh</span>
          </button>

          <button
            onClick={() => setScreen('emotion-tracking')}
            className="flex flex-col items-center justify-center gap-2 bg-[#FFF3E0] text-[#E65100] p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 border border-[#FFE0B2]"
          >
            <Activity className="w-6 h-6" />
            <span className="text-sm font-bold leading-tight">Hành trình cảm xúc</span>
          </button>
        </div>

        {/* 5. Teacher/Parent Access Button */}
        <div className="w-full mt-6">
          <button
            onClick={() => {
              setPinInput('');
              setPinError(false);
              setIsPinModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#F0F4F8] text-[#4A5568] rounded-2xl font-bold text-sm border border-[#D1D5DB] hover:bg-[#E2E8F0] transition-all active:scale-95"
          >
            <Shield className="w-5 h-5" />
            Dành cho thầy cô 👩‍🏫
          </button>
        </div>

        {/* Extra links for Journey and Saved items */}
        <div className="mt-8 flex gap-6">
           {savedAdvices.length > 0 && (
              <button
                onClick={() => setScreen('saved')}
                className="flex items-center gap-1 text-[#8E8E80] text-sm font-medium hover:text-[#5A5A40] transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Kho báu của em
              </button>
            )}
            {(completedSituations.length > 0 || rewardRecords.length > 0) && (
              <button
                onClick={() => setScreen('journey')}
                className="flex items-center gap-1 text-[#8E8E80] text-sm font-medium hover:text-[#5A5A40] transition-colors"
              >
                <Trophy className="w-4 h-4" />
                Hành trình của em
              </button>
            )}
        </div>
      </div>
    </motion.div>
  );

  const renderEmotionSelection = () => (
    <motion.div 
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="flex-1 flex flex-col h-full overflow-y-auto"
    >
      <div className="max-w-2xl w-full mx-auto flex flex-col h-full p-6">
        <header className="flex items-center justify-start mb-4 sticky top-0 z-10 bg-transparent">
          <HomeButton onClick={() => setScreen('onboarding')} />
        </header>

        <div className="mt-4 mb-8 text-center">
          <h2 className="text-4xl font-bold text-[#5A5A40] mb-2">Hôm nay em thấy thế nào?</h2>
          <p className="text-xl text-[#8E8E80]">Hãy chọn một cảm xúc nhé!</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1 overflow-y-auto pb-8 no-scrollbar">
          {EMOTIONS.map((emotion) => (
            <motion.button
              key={emotion.id}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectEmotion(emotion)}
              style={{ backgroundColor: emotion.bgColor }}
              className="flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border-2 border-transparent hover:border-white shadow-md transition-all aspect-square"
            >
              <span className="text-6xl md:text-7xl">{emotion.emoji}</span>
              <span className="text-xl md:text-2xl font-bold" style={{ color: emotion.color }}>
                {emotion.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const renderChat = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col h-full"
    >
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E5D5] py-4 px-6 z-10">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setScreen('emotion')} className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors" title="Quay lại chọn cảm xúc">
                <ArrowLeft className="w-6 h-6 text-[#8E8E80]" />
              </button>
              <HomeButton onClick={() => setScreen('onboarding')} />
            </div>
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner border-2 border-[#E3F2FD] overflow-hidden">
              {mascotUrl ? (
                <img src={mascotUrl} alt="Bobi" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Bot className="text-[#4A90E2] w-7 h-7" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#5A5A40]">Bobi</h1>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-[#8E8E80] font-bold uppercase">Đang lắng nghe...</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-[#FFFDE7] px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-[#FFD93D] shadow-sm">
              <Star className="w-4 h-4 text-[#FFD93D] fill-[#FFD93D]" />
              <span className="text-[#8B7E00] font-black text-sm">{totalStars}</span>
            </div>
            <button onClick={() => setScreen('saved')} className="p-2 bg-[#E3F2FD] rounded-full hover:bg-[#BBDEFB] transition-colors relative">
              <Bookmark className="w-6 h-6 text-[#4A90E2]" />
              {savedAdvices.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {savedAdvices.length}
                </span>
              )}
            </button>
            <button onClick={() => setScreen('reward')} className="p-2 bg-[#FFF3E0] rounded-full hover:bg-[#FFE0B2] transition-colors">
              <Award className="w-6 h-6 text-[#FF9800]" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main 
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 overflow-y-auto p-4 md:p-8"
      >
        <div className="max-w-3xl mx-auto space-y-8">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-4 max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-md overflow-hidden ${
                    msg.role === 'user' ? 'bg-[#4A90E2]' : 'bg-white border-2 border-[#E3F2FD]'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-6 h-6 text-white" />
                    ) : mascotUrl ? (
                      <img src={mascotUrl} alt="Bobi" className="full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Bot className="w-6 h-6 text-[#4A90E2]" />
                    )}
                  </div>
                  
                      <div className="space-y-3">
                        <div className={`p-5 rounded-3xl shadow-md whitespace-pre-wrap leading-relaxed text-lg md:text-xl relative ${
                          msg.role === 'user' 
                            ? 'bg-[#4A90E2] text-white rounded-tr-none' 
                            : 'bg-white text-[#4A4A40] rounded-tl-none border border-[#E5E5D5]'
                        }`}>
                          {msg.text}
                          
                          {saveFeedback === msg.id && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.5, y: 0 }}
                              animate={{ opacity: 1, scale: 1, y: -40 }}
                              exit={{ opacity: 0 }}
                              className="absolute -top-12 left-0 right-0 flex justify-center z-20 pointer-events-none"
                            >
                              <div className="bg-[#FFF9C4] text-[#8B7E00] px-4 py-2 rounded-2xl text-sm font-bold shadow-lg border-2 border-[#FFF176] whitespace-nowrap">
                                🌟 Đã lưu rồi! Khi cần, mình cùng xem lại nhé!
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {msg.isActionCard && msg.steps && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border-2 border-[#E8F5E9] rounded-3xl p-6 shadow-lg space-y-5"
                          >
                            <div className="flex items-center gap-2 text-[#4CAF50] font-bold text-xl">
                              <CheckCircle2 className="w-7 h-7" />
                              <span>Kế hoạch gỡ rối cho em:</span>
                            </div>
                            <div className="space-y-4">
                              {msg.steps.map((step, idx) => (
                                <div key={idx} className="flex gap-4 items-start p-4 bg-[#F1F8E9] rounded-2xl">
                                  <div className="w-8 h-8 bg-[#4CAF50] text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                                    {idx + 1}
                                  </div>
                                  <p className="text-[#5A5A40] font-medium text-lg">{step}</p>
                                </div>
                              ))}
                            </div>
                            <button 
                              onClick={() => setScreen('reward')}
                              className="w-full py-4 bg-[#4CAF50] text-white rounded-2xl font-bold text-lg shadow-md hover:bg-[#43A047] transition-colors active:scale-95"
                            >
                              Em đã làm xong!
                            </button>
                          </motion.div>
                        )}

                        {msg.role === 'model' && msg.type === 'advice' && (msg.hasAdvice || msg.isActionCard) && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <motion.button 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              onClick={() => saveAdvice(msg)}
                              disabled={msg.isSaved}
                              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all shadow-sm w-fit ${
                                msg.isSaved 
                                  ? 'bg-[#F1F8E9] text-[#4CAF50] cursor-default border border-[#C8E6C9]' 
                                  : 'bg-[#E0F2F1] text-[#00796B] border border-[#B2DFDB] hover:bg-[#B2DFDB] active:scale-95'
                              }`}
                            >
                              {msg.isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                              {msg.isSaved ? 'Đã lưu' : 'Lưu lại lời khuyên'}
                            </motion.button>
                            
                            {msg.isSaved && (
                              <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={() => setScreen('journey')}
                                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold bg-white text-[#4A90E2] border border-[#E3F2FD] shadow-sm hover:bg-[#F5F9FF] active:scale-95"
                              >
                                <Activity className="w-4 h-4" />
                                Hành trình của em
                              </motion.button>
                            )}
                          </div>
                        )}
                      </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full border border-[#E5E5D5] flex items-center gap-3 shadow-sm">
                <RefreshCw className="w-5 h-5 animate-spin text-[#8E8E80]" />
                <span className="text-base text-[#8E8E80] italic font-semibold">Bobi đang suy nghĩ...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Suggestions & Input */}
      <footer className="p-4 md:p-6 bg-white/80 backdrop-blur-md border-t border-[#E5E5D5]">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {(selectedEmotion ? EMOTION_SUGGESTIONS[selectedEmotion.id] || DEFAULT_SUGGESTIONS : DEFAULT_SUGGESTIONS).map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="whitespace-nowrap px-6 py-3 bg-white text-[#8E8E80] rounded-full text-base font-bold border-2 border-[#F0F0E0] hover:bg-[#FFD93D] hover:text-[#8B7E00] hover:border-[#FFD93D] transition-all shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
          
          <div className="flex gap-4 items-end">
            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Nhắn cho Bobi nhé..."
                className="w-full bg-[#F5F5F0] border-none rounded-3xl px-8 py-5 pr-16 focus:ring-4 focus:ring-[#FFD93D]/30 resize-none min-h-[72px] max-h-40 text-xl text-[#4A4A40] placeholder-[#A0A090] shadow-inner"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute right-3 bottom-3 p-4 bg-[#FFD93D] text-[#8B7E00] rounded-2xl hover:bg-[#F7D02C] disabled:opacity-50 transition-all shadow-lg active:scale-90"
              >
                <Send className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  );

  const renderReward = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex flex-col h-full overflow-y-auto"
    >
      <header className="p-6 sticky top-0 z-10">
        <HomeButton onClick={() => setScreen('onboarding')} />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-fit">
        <div className="max-w-2xl w-full flex flex-col items-center">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-8"
        >
          <Star className="w-32 h-32 text-[#FFD93D] fill-[#FFD93D] drop-shadow-xl" />
        </motion.div>
        
        <h2 className="text-4xl md:text-5xl font-black text-[#5A5A40] mb-4">Tuyệt vời quá! 🌟</h2>
        <p className="text-xl md:text-2xl text-[#8E8E80] mb-12 leading-relaxed max-w-md">
          Em đã rất dũng cảm khi đối mặt với cảm xúc của mình. Tặng em một ngôi sao may mắn nhé!
        </p>
        
        <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-[#FFD93D] mb-12 w-full max-w-sm">
          <div className="flex justify-center gap-3 mb-6">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-10 h-10 text-[#FFD93D] fill-[#FFD93D]" />
            ))}
          </div>
          <p className="text-xl font-bold text-[#5A5A40]">Huy hiệu: Bé Dũng Cảm</p>
        </div>
        
        <button
          onClick={() => setScreen('emotion')}
          className="flex items-center gap-3 bg-[#4A90E2] text-white px-12 py-6 rounded-3xl text-2xl font-bold shadow-lg hover:bg-[#357ABD] transition-all active:scale-95"
        >
          Tiếp tục thôi <Home className="w-8 h-8" />
        </button>
      </div>
    </div>
    </motion.div>
  );

  const renderLessons = () => {
    const categories = ['Cảm xúc', 'Giao tiếp', 'Bạn bè', 'Gia đình', 'Bản thân'] as const;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex-1 flex flex-col h-full"
      >
        <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E5D5] py-6 px-6 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto w-full flex items-center gap-4">
            <button onClick={() => selectedLesson ? setSelectedLesson(null) : setScreen('onboarding')} className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors">
              <ArrowLeft className="w-8 h-8 text-[#8E8E80]" />
            </button>
            <HomeButton onClick={() => setScreen('onboarding')} />
            <h1 className="text-2xl md:text-3xl font-bold text-[#5A5A40] truncate">
              {selectedLesson ? 'Chi tiết bài học' : 'Kho bài học mini 📚'}
            </h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-3xl mx-auto">
            {!selectedLesson ? (
              <div className="space-y-12">
                {categories.map((cat) => (
                  <div key={cat} className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-2 bg-[#FFD93D] rounded-full" />
                      <h2 className="text-2xl font-black text-[#5A5A40] uppercase tracking-wider">{cat}</h2>
                    </div>
                    <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar -mx-2 px-2">
                      {MINI_LESSONS.filter(l => l.category === cat).map((lesson) => (
                        <motion.button
                          key={lesson.id}
                          whileHover={{ scale: 1.02, y: -5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedLesson(lesson)}
                          className="flex-shrink-0 w-64 bg-white rounded-3xl p-6 shadow-lg border-2 border-transparent hover:border-[#FFD93D] transition-all text-left flex flex-col gap-4"
                        >
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner" style={{ backgroundColor: `${lesson.color}20` }}>
                            {lesson.icon}
                          </div>
                          <h3 className="text-xl font-bold text-[#5A5A40] leading-tight">{lesson.title}</h3>
                          <div className="mt-auto flex items-center text-[#4A90E2] font-bold text-sm">
                            Xem bài học <ChevronRight className="w-4 h-4" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[40px] shadow-2xl overflow-hidden border-2 border-[#E5E5D5]"
              >
                <div className="h-64 relative overflow-hidden bg-gradient-to-br from-[#F5F9FF] to-[#E3F2FD]">
                  <img 
                    src={`https://picsum.photos/seed/${selectedLesson.imageSeed}/800/400`} 
                    alt={selectedLesson.title}
                    className="w-full h-full object-cover opacity-80"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute bottom-6 left-8">
                    <div className="text-6xl mb-2">{selectedLesson.icon}</div>
                    <h2 className="text-4xl font-black text-white drop-shadow-md">{selectedLesson.title}</h2>
                  </div>
                </div>

                <div className="p-8 md:p-12 space-y-8">
                  <div className="space-y-6">
                    {selectedLesson.content.map((sentence, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex gap-4 items-start"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0 mt-1">
                          <div className="w-2 h-2 rounded-full bg-[#4A90E2]" />
                        </div>
                        <p className="text-2xl text-[#4A4A40] leading-relaxed font-medium">
                          {sentence}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  <div className="pt-8 border-t-2 border-[#F5F5F0]">
                    <div className="bg-[#FFFDE7] p-8 rounded-3xl border-2 border-[#FFD93D] text-center">
                      <p className="text-2xl font-bold text-[#8B7E00] italic">
                        "{selectedLesson.ending}"
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedLesson(null)}
                    className="w-full bg-[#4A90E2] text-white py-5 rounded-2xl text-xl font-bold shadow-md hover:bg-[#357ABD] transition-all"
                  >
                    Xong rồi, quay lại thôi!
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </motion.div>
    );
  };

  const renderEmotionTracking = () => {
    const getSummary = () => {
      const counts: Record<string, number> = {};
      emotionRecords.forEach(r => {
        counts[r.emotionId] = (counts[r.emotionId] || 0) + 1;
      });

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const top = sorted[0]?.[0];
      const topCount = sorted[0]?.[1] || 0;

      let insight = "Bobi đang cùng bạn khám phá cảm xúc mỗi ngày đó!";
      let action = "Hãy tiếp tục chia sẻ với mình nhé 💛";

      if (top === 'sad' && topCount >= 2) {
        insight = "Dạo gần đây bạn hay cảm thấy buồn hơn một chút 😢";
        action = "Bạn có thể thử nói chuyện với bố mẹ hoặc thầy cô nhé 💛";
      } else if (top === 'angry' && topCount >= 2) {
        insight = "Có vẻ bạn đang gặp vài chuyện gây bực bội 😡";
        action = "Bạn thử hít thở sâu và đếm từ 1 đến 5 nha";
      } else if (top === 'tired' && topCount >= 2) {
        insight = "Có vẻ bạn đang hơi mệt, bạn nên nghỉ ngơi thêm nhé 😴";
        action = "Bạn nên nghỉ ngơi một chút và uống nước nhé";
      } else if (top === 'happy' && topCount >= 2) {
        insight = "Bạn đang có những ngày thật tuyệt vời và vui vẻ 😊";
        action = "Hãy lan tỏa niềm vui này đến mọi người xung quanh nhé!";
      } else if (emotionRecords.length >= 3) {
        insight = "Bạn đang làm rất tốt trong việc nhận biết cảm xúc đó 😊";
        action = "Mỗi ngày là một trải nghiệm mới, hãy cứ tự tin nhé!";
      }

      return { insight, action, counts };
    };

    const { insight, action, counts } = getSummary();

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex-1 flex flex-col h-full"
      >
        <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E5D5] py-6 px-6 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto w-full flex items-center gap-4">
            <button onClick={() => setScreen('onboarding')} className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors">
              <ArrowLeft className="w-8 h-8 text-[#8E8E80]" />
            </button>
            <HomeButton onClick={() => setScreen('onboarding')} />
            <h1 className="text-2xl md:text-3xl font-bold text-[#5A5A40] truncate">Hành trình cảm xúc 🌈</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Insight Card */}
            <div className="bg-white rounded-[40px] shadow-xl p-8 border-2 border-[#E8F5E9] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#4CAF50]/5 rounded-full -mr-16 -mt-16" />
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-[#F1F8E9] rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                  ✨
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-[#5A5A40]">Lời nhắn từ Bobi</h3>
                  <p className="text-xl text-[#4A4A40] leading-relaxed font-medium">
                    {insight}
                  </p>
                  <div className="bg-[#FFFDE7] p-4 rounded-2xl border-2 border-[#FFD93D] inline-block">
                    <p className="text-lg font-bold text-[#8B7E00]">
                      💡 Gợi ý: {action}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {EMOTIONS.map(e => (
                <div key={e.id} className="bg-white p-6 rounded-3xl shadow-md border-2 border-[#F5F5F0] flex flex-col items-center gap-2">
                  <span className="text-4xl">{e.emoji}</span>
                  <span className="text-sm font-bold text-[#8E8E80] uppercase tracking-wider">{e.label}</span>
                  <span className="text-2xl font-black text-[#5A5A40]">{counts[e.id] || 0}</span>
                </div>
              ))}
            </div>

            {/* History List */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-[#5A5A40] ml-2">Nhật ký gần đây</h3>
              <div className="space-y-3">
                {emotionRecords.slice(0, 7).map((record, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/60 p-5 rounded-3xl border border-[#E5E5D5] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                        {record.emoji}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-[#5A5A40]">{record.label}</p>
                        <p className="text-sm text-[#8E8E80]">{record.date}</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </motion.div>
    );
  };

  const renderParentConnect = () => {
    const generateParentMessage = () => {
      let state = "Bé đang cảm thấy bình thường.";
      let suggestion = "Hãy dành thời gian trò chuyện cùng bé nhé.";
      let emoji = "😊";

      if (selectedEmotion) {
        state = `Hôm nay bé đang cảm thấy ${selectedEmotion.label.toLowerCase()}.`;
        emoji = selectedEmotion.emoji;
      }

      // Add emotional trend insight
      const counts: Record<string, number> = {};
      emotionRecords.slice(0, 7).forEach(r => {
        counts[r.emotionId] = (counts[r.emotionId] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const top = sorted[0]?.[0];
      const topCount = sorted[0]?.[1] || 0;

      if (top === 'sad' && topCount >= 2) {
        state += ` Tuần này bé có vẻ hay buồn hơn một chút.`;
        suggestion = `Bạn có thể dành thời gian hỏi han và lắng nghe tâm sự của bé nhé.`;
      } else if (top === 'angry' && topCount >= 2) {
        state += ` Gần đây bé dễ cáu gắt hơn bình thường.`;
        suggestion = `Có thể bé đang gặp áp lực, hãy cùng bé tìm hiểu nguyên nhân nhé.`;
      } else if (emotionRecords.length >= 5) {
        state += ` Bé đang tiến bộ tốt trong việc nhận biết và chia sẻ cảm xúc.`;
        suggestion = `Hãy tiếp tục khích lệ bé duy trì thói quen tốt này nhé.`;
      }

      const lastDaily = completedSituations[0];
      if (lastDaily && lastDaily.stars === 3) {
        state += ` Bé vừa xử lý một tình huống thực tế rất tốt!`;
        suggestion = `Bé đã thể hiện sự tử tế và thông minh. Hãy khen ngợi để khích lệ bé nhé.`;
      }

      return { state, suggestion, emoji };
    };

    const { state, suggestion, emoji } = generateParentMessage();

    return (
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="flex-1 flex flex-col h-full"
      >
        <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E5D5] py-6 px-6 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto w-full flex items-center gap-4">
            <button onClick={() => setScreen('onboarding')} className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors">
              <ArrowLeft className="w-8 h-8 text-[#8E8E80]" />
            </button>
            <HomeButton onClick={() => setScreen('onboarding')} />
            <h1 className="text-2xl md:text-3xl font-bold text-[#5A5A40] truncate">Kết nối phụ huynh 👨‍👩‍👧‍👦</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-xl mx-auto space-y-8">
            <div className="bg-white rounded-[40px] shadow-2xl p-10 border-2 border-[#E5E5D5] space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#A29BFE]/10 rounded-full -mr-16 -mt-16" />
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 bg-[#F5F5F0] rounded-full flex items-center justify-center text-5xl shadow-inner">
                  {emoji}
                </div>
                <h3 className="text-3xl font-black text-[#5A5A40]">Gửi lời nhắn cho Ba Mẹ</h3>
              </div>

              <div className="space-y-6">
                <div className="bg-[#F5F9FF] p-6 rounded-3xl border-l-8 border-[#4A90E2]">
                  <h4 className="text-sm font-bold text-[#4A90E2] uppercase mb-2 tracking-widest">Tâm trạng của bé:</h4>
                  <p className="text-2xl text-[#4A4A40] font-medium leading-tight">
                    {state}
                  </p>
                </div>

                <div className="bg-[#F1F8E9] p-6 rounded-3xl border-l-8 border-[#4CAF50]">
                  <h4 className="text-sm font-bold text-[#4CAF50] uppercase mb-2 tracking-widest">Gợi ý cho Ba Mẹ:</h4>
                  <p className="text-xl text-[#4A4A40] leading-relaxed">
                    {suggestion}
                  </p>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => {
                    const text = `Ba mẹ ơi 🌱\n${state}\n\nBobi đã gợi ý cho con:\n${suggestion}\n\nBa mẹ trò chuyện thêm với con nhé ❤️`;
                    openShareModal(text);
                  }}
                  className="w-full bg-[#A29BFE] text-white py-6 rounded-3xl text-2xl font-bold shadow-lg hover:bg-[#6C5CE7] transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  Chia sẻ với Ba Mẹ <Share2 className="w-8 h-8" />
                </button>
              </div>
            </div>

            <div className="bg-white/50 p-6 rounded-3xl border-2 border-dashed border-[#8E8E80]/30 flex gap-4 items-start">
              <Info className="w-6 h-6 text-[#8E8E80] flex-shrink-0 mt-1" />
              <p className="text-sm text-[#8E8E80] leading-relaxed">
                Tính năng này giúp Ba Mẹ hiểu bé hơn thông qua các hoạt động của bé trên ứng dụng. Mọi thông tin đều được gửi đi một cách tích cực và xây dựng.
              </p>
            </div>
          </div>
        </main>
      </motion.div>
    );
  };

  const renderSavedAdvices = () => (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="flex-1 flex flex-col h-full"
    >
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E5D5] py-6 px-6 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setScreen('chat')} className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors">
              <ArrowLeft className="w-8 h-8 text-[#8E8E80]" />
            </button>
            <HomeButton onClick={() => setScreen('onboarding')} />
            <h1 className="text-2xl md:text-3xl font-bold text-[#5A5A40] truncate">Kho báu lời khuyên 💎</h1>
          </div>
          <div className="bg-[#E3F2FD] px-4 py-2 rounded-full text-[#4A90E2] font-bold text-lg">
            {savedAdvices.length} món quà
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-3xl mx-auto">
          {savedAdvices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-[#E3F2FD]">
                <Bookmark className="w-16 h-16 text-[#E3F2FD]" />
              </div>
              <h3 className="text-2xl font-bold text-[#8E8E80]">Kho báu đang trống...</h3>
              <p className="text-lg text-[#A0A090] max-w-xs">
                Khi Bobi đưa ra lời khuyên hay, em hãy nhấn nút "Lưu lại" để cất vào đây nhé!
              </p>
              <button 
                onClick={() => setScreen('chat')}
                className="bg-[#4A90E2] text-white px-8 py-4 rounded-2xl font-bold shadow-md"
              >
                Quay lại trò chuyện
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {savedAdvices.map((advice) => (
                <motion.div
                  key={advice.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl p-8 shadow-lg border-2 border-[#E3F2FD] relative group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-[#4A90E2]">
                      <Star className="w-6 h-6 fill-[#4A90E2]" />
                      <span className="text-sm font-bold uppercase tracking-wider">Lời khuyên từ Bobi</span>
                    </div>
                    <button 
                      onClick={() => deleteAdvice(advice.id)}
                      className="p-2 text-[#FF6B6B] hover:bg-[#FFEBEE] rounded-full transition-colors"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-[#5A5A40] mb-4 leading-tight">
                    {advice.title}
                  </h3>
                  
                  <div className="text-xl text-[#4A4A40] leading-relaxed whitespace-pre-wrap mb-6">
                    {advice.text}
                  </div>
                  
                  <div className="text-sm text-[#A0A090] font-medium italic">
                    Lưu vào ngày {advice.timestamp.toLocaleDateString('vi-VN')} lúc {advice.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </motion.div>
  );

  const renderDailySituation = () => (
    <motion.div 
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="flex-1 flex flex-col h-full overflow-y-auto"
    >
      <div className="max-w-2xl w-full mx-auto flex flex-col h-full p-6">
        <header className="flex items-center gap-4 mb-8 sticky top-0 z-10 bg-transparent">
          <button onClick={() => setScreen('onboarding')} className="p-2 hover:bg-white/50 rounded-full transition-colors">
            <ArrowLeft className="w-8 h-8 text-[#8E8E80]" />
          </button>
          <HomeButton onClick={() => setScreen('onboarding')} />
          <h2 className="text-2xl md:text-3xl font-bold text-[#5A5A40] truncate">Tình huống mỗi ngày</h2>
        </header>

        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {!evaluationResult ? (
              <motion.div
                key="question"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-[#E3F2FD] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-[#4A90E2]" />
                  <div className="flex items-center gap-3 mb-4 text-[#4A90E2] font-bold">
                    <HelpCircle className="w-6 h-6" />
                    <span>Chủ đề: {currentSituation?.topic}</span>
                  </div>
                  <p className="text-2xl text-[#5A5A40] font-medium leading-relaxed">
                    {currentSituation?.text}
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="block text-xl font-bold text-[#5A5A40] ml-2">Câu trả lời của em:</label>
                  <textarea
                    value={dailyAnswer}
                    onChange={(e) => setDailyAnswer(e.target.value)}
                    placeholder="Em sẽ làm gì nhỉ? Hãy viết vào đây nhé..."
                    className="w-full bg-white border-2 border-[#E5E5D5] rounded-3xl p-6 text-xl text-[#4A4A40] focus:ring-4 focus:ring-[#4A90E2]/20 focus:border-[#4A90E2] outline-none min-h-[200px] shadow-inner"
                  />
                </div>

                <button
                  onClick={submitDailyAnswer}
                  disabled={!dailyAnswer.trim() || isLoading}
                  className="w-full bg-[#4A90E2] text-white py-6 rounded-3xl text-2xl font-bold shadow-lg hover:bg-[#357ABD] disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <>Gửi câu trả lời <SendHorizontal className="w-8 h-8" /></>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-[#FFD93D] text-center space-y-6">
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3].map((star) => (
                      <motion.div
                        key={star}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: star * 0.2, type: "spring" }}
                      >
                        <Star 
                          className={`w-16 h-16 ${star <= evaluationResult.stars ? 'text-[#FFD93D] fill-[#FFD93D]' : 'text-gray-200'}`} 
                        />
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-[#5A5A40]">
                      {evaluationResult.stars === 3 ? 'Tuyệt vời quá! 🌟' : evaluationResult.stars === 2 ? 'Làm tốt lắm! ✨' : 'Cố gắng lên nhé! 💪'}
                    </h3>
                    <p className="text-xl text-[#FF9800] font-bold uppercase tracking-widest">
                      Bạn nhận được {evaluationResult.stars} sao vì bạn đã {evaluationResult.evaluation.toLowerCase()}!
                    </p>
                  </div>

                  <div className="bg-[#F5F5F0] p-6 rounded-2xl text-left">
                    <p className="text-xl text-[#4A4A40] leading-relaxed whitespace-pre-wrap">
                      {evaluationResult.feedback}
                    </p>
                  </div>

                  <button
                    onClick={() => setScreen('journey')}
                    className="w-full bg-[#FFD93D] text-[#8B7E00] py-5 rounded-2xl text-xl font-bold shadow-md hover:bg-[#F7D02C] transition-all"
                  >
                    Xem hành trình của em
                  </button>
                  
                  <button
                    onClick={() => setScreen('onboarding')}
                    className="text-[#8E8E80] font-bold hover:text-[#5A5A40] transition-colors"
                  >
                    Quay về trang chủ
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );

  const getTodayStars = () => {
    const today = new Date().toLocaleDateString('vi-VN');
    return rewardRecords
      .filter(r => r.date === today)
      .reduce((acc, curr) => acc + curr.stars, 0);
  };

  const renderJourney = () => (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="flex-1 flex flex-col h-full bg-[#FDFDF8]"
    >
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E5D5] py-6 px-6 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setScreen('onboarding')} className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors">
              <ArrowLeft className="w-8 h-8 text-[#8E8E80]" />
            </button>
            <HomeButton onClick={() => setScreen('onboarding')} />
            <h1 className="text-2xl md:text-3xl font-bold text-[#5A5A40] truncate">Hành trình của em 🚀</h1>
          </div>
          <div className="flex items-center gap-2 bg-[#FFF3E0] px-4 py-2 rounded-full text-[#FF9800] font-bold text-lg">
            <Star className="w-6 h-6 fill-[#FF9800]" />
            {totalStars} sao
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-3xl mx-auto">
          {completedSituations.length === 0 && rewardRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-[#FFF3E0]">
                <Trophy className="w-16 h-16 text-[#FFF3E0]" />
              </div>
              <h3 className="text-2xl font-bold text-[#8E8E80]">Hành trình mới bắt đầu...</h3>
              <p className="text-lg text-[#A0A090] max-w-xs">
                Hãy cùng Bobi trò chuyện và giải quyết các tình huống mỗi ngày để tích lũy thật nhiều sao nhé!
              </p>
              <button 
                onClick={() => setScreen('onboarding')}
                className="bg-[#4A90E2] text-white px-8 py-4 rounded-2xl font-bold shadow-md"
              >
                Bắt đầu ngay
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-md border-2 border-[#FFF3E0] flex flex-col items-center gap-2">
                  <Star className="w-10 h-10 text-[#FFD93D] fill-[#FFD93D]" />
                  <span className="text-sm font-bold text-[#8E8E80] uppercase">Tổng số sao</span>
                  <span className="text-3xl font-black text-[#5A5A40]">{totalStars}</span>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-md border-2 border-[#E3F2FD] flex flex-col items-center gap-2">
                  <Sparkles className="w-10 h-10 text-[#4A90E2]" />
                  <span className="text-sm font-bold text-[#8E8E80] uppercase">Sao hôm nay</span>
                  <span className="text-3xl font-black text-[#5A5A40]">{getTodayStars()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {completedSituations.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-[32px] p-8 shadow-xl border-2 border-[#FFF3E0] relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFF3E0]/20 rounded-full -mr-12 -mt-12" />
                    
                    <div className="flex justify-between items-center mb-6 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#FFF3E0] p-2 rounded-xl">
                          <Calendar className="w-5 h-5 text-[#FF9800]" />
                        </div>
                        <span className="text-base font-bold text-[#8E8E80]">
                          {item.date}
                        </span>
                      </div>
                      <div className="flex gap-1.5 bg-[#FFFDE7] px-4 py-2 rounded-full border border-[#FFD93D]">
                        {[1, 2, 3].map(s => (
                          <Star key={s} className={`w-5 h-5 ${s <= item.stars ? 'text-[#FFD93D] fill-[#FFD93D]' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-8 relative z-10">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[#FF9800]">
                          <HelpCircle className="w-5 h-5" />
                          <h4 className="text-sm font-black uppercase tracking-wider">Tình huống:</h4>
                        </div>
                        <p className="text-xl text-[#5A5A40] font-semibold leading-relaxed pl-7">{item.situation}</p>
                      </div>

                      <div className="bg-[#F5F9FF] p-6 rounded-3xl border-2 border-[#E3F2FD] space-y-3">
                        <div className="flex items-center gap-2 text-[#4A90E2]">
                          <User className="w-5 h-5" />
                          <h4 className="text-sm font-black uppercase tracking-wider">Câu trả lời của em:</h4>
                        </div>
                        <p className="text-lg text-[#4A4A40] italic pl-7">"{item.userAnswer}"</p>
                      </div>

                      <div className="bg-[#F1F8E9] p-6 rounded-3xl border-2 border-[#E8F5E9] space-y-3">
                        <div className="flex items-center gap-2 text-[#4CAF50]">
                          <Bot className="w-5 h-5" />
                          <h4 className="text-sm font-black uppercase tracking-wider">Bobi nhận xét:</h4>
                        </div>
                        <div className="text-lg text-[#4A4A40] leading-relaxed pl-7 whitespace-pre-wrap">
                          {item.aiFeedback}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </motion.div>
  );

  const getTrendData = (days: number, studentId?: string) => {
    const data = [];
    let targetRecords: EmotionRecord[] = [];

    if (studentId) {
      targetRecords = teacherState.students.find(s => s.id === studentId)?.emotionRecords || [];
    } else {
      // Aggregate all student records for class trend
      teacherState.students.forEach(s => {
        targetRecords = [...targetRecords, ...(s.emotionRecords || [])];
      });
      // Also include current user's records if not already in students
      if (!teacherState.students.find(s => s.id === 'current-user')) {
        targetRecords = [...targetRecords, ...emotionRecords];
      }
    }

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayRecords = targetRecords.filter(r => r.date === dateStr);
      
      // Calculate positive vs difficult
      const positive = dayRecords.filter(r => ['happy', 'excited'].includes(r.emotionId)).length;
      const difficult = dayRecords.filter(r => ['sad', 'angry', 'worried', 'confused', 'tired'].includes(r.emotionId)).length;

      data.push({
        name: format(date, 'dd/MM'),
        positive,
        difficult,
        total: dayRecords.length
      });
    }
    return data;
  };

  const renderTeacherDashboard = () => {
    const activeStudent = selectedStudentId 
      ? teacherState.students.find(s => s.id === selectedStudentId) 
      : null;

    const renderOverview = () => {
      const stats = {
        total: teacherState.students.length,
        positive: teacherState.students.filter(s => s.frequentEmotion === 'Vui').length,
        attention: teacherState.students.filter(s => s.supportLevel !== 'Ổn định').length,
        alerts: teacherState.alerts.length + teacherState.students.reduce((acc, s) => acc + s.alerts.length, 0)
      };

      return (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <Users className="w-8 h-8 text-blue-500 mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase">Tổng số học sinh</p>
              <p className="text-3xl font-black text-slate-800">{stats.total}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <Smile className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase">Cảm xúc tích cực</p>
              <p className="text-3xl font-black text-slate-800">{stats.positive}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase">Cần chú ý</p>
              <p className="text-3xl font-black text-slate-800">{stats.attention}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <Activity className="w-8 h-8 text-red-500 mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase">Cảnh báo hoạt động</p>
              <p className="text-3xl font-black text-slate-800">{stats.alerts}</p>
            </div>
          </div>

          {/* Class Trends */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Xu hướng cảm xúc lớp học (30 ngày)</h2>
              <TrendingUp className="w-6 h-6 text-slate-400" />
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getTrendData(30)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="positive" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="difficult" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-6 justify-center text-sm font-medium">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Tích cực</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /> Khó khăn</div>
            </div>
          </div>

          <button 
            onClick={() => setTeacherView('student-list')}
            className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Xem danh sách học sinh
          </button>
        </div>
      );
    };

    const renderStudentList = () => (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Danh sách học sinh</h2>
          <button onClick={() => setTeacherView('overview')} className="text-sm font-bold text-blue-600 hover:underline">Quay lại tổng quan</button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {teacherState.students.map(student => {
            const emotionIcon = EMOTIONS.find(e => e.label === student.frequentEmotion)?.emoji || '❓';
            return (
              <div 
                key={student.id} 
                onClick={() => { setSelectedStudentId(student.id); setTeacherView('student-detail'); }}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    student.supportLevel === 'Ổn định' ? 'bg-emerald-100 text-emerald-600' :
                    student.supportLevel === 'Cần chú ý' ? 'bg-amber-100 text-amber-600' : 
                    student.supportLevel === 'Cần quan tâm' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {emotionIcon}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{student.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        student.supportLevel === 'Ổn định' ? 'bg-emerald-50 text-emerald-600' :
                        student.supportLevel === 'Cần chú ý' ? 'bg-amber-50 text-amber-600' : 
                        student.supportLevel === 'Cần quan tâm' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {student.supportLevel}
                      </span>
                      <span className="text-xs text-slate-400">• Thường thấy: {student.frequentEmotion}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Ngôi sao</p>
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-4 h-4 fill-amber-500" />
                      {student.totalStars}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Hoạt động cuối</p>
                    <p className="text-sm text-slate-600">{student.lastActivity}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );

    const renderStudentDetail = () => {
      if (!activeStudent) return null;
      
      const studentAlerts = activeStudent.id === 'current-user' ? teacherState.alerts : activeStudent.alerts;
      const studentSummaries = activeStudent.id === 'current-user' ? teacherState.summaries : activeStudent.summaries;
      const studentRecords = activeStudent.id === 'current-user' ? emotionRecords : activeStudent.emotionRecords;
      const studentSituations = activeStudent.id === 'current-user' ? completedSituations : activeStudent.completedSituations;

      const frequencyData = getChartData(30, activeStudent.id);

      const studentIndex = teacherState.students.findIndex(s => s.id === activeStudent.id);
      const prevStudent = studentIndex > 0 ? teacherState.students[studentIndex - 1] : null;
      const nextStudent = studentIndex < teacherState.students.length - 1 ? teacherState.students[studentIndex + 1] : null;

      return (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setTeacherView('student-list')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-500" />
              </button>
              <div>
                <h2 className="text-3xl font-black text-slate-800">{activeStudent.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    activeStudent.supportLevel === 'Ổn định' ? 'bg-emerald-50 text-emerald-600' :
                    activeStudent.supportLevel === 'Cần chú ý' ? 'bg-amber-50 text-amber-600' : 
                    activeStudent.supportLevel === 'Cần quan tâm' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {activeStudent.supportLevel}
                  </span>
                  <span className="text-xs text-slate-400">• ID: {activeStudent.id}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                disabled={!prevStudent}
                onClick={() => setSelectedStudentId(prevStudent?.id || '')}
                className="p-2 hover:bg-slate-50 disabled:opacity-30 transition-all rounded-xl"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="px-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Học sinh</p>
                <p className="text-sm font-black text-slate-800 leading-none">
                  {studentIndex + 1} / {teacherState.students.length}
                </p>
              </div>
              <button 
                disabled={!nextStudent}
                onClick={() => setSelectedStudentId(nextStudent?.id || '')}
                className="p-2 hover:bg-slate-50 disabled:opacity-30 transition-all rounded-xl"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Alerts & Suggestions */}
          {studentAlerts.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" /> Cảnh báo & Gợi ý can thiệp
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentAlerts.map(alert => (
                  <div key={alert.id} className="bg-white p-6 rounded-2xl border-l-4 border-l-red-500 shadow-sm border border-slate-200 space-y-4">
                    <p className="font-bold text-slate-800">{alert.message}</p>
                    <div className="bg-amber-50 p-4 rounded-xl space-y-2">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Gợi ý cho giáo viên:</p>
                      <ul className="text-sm text-amber-800 list-disc pl-4 space-y-1">
                        {alert.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Emotion Frequency & Stars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Tần suất cảm xúc (30 ngày)</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {EMOTIONS.map(e => {
                  const data = frequencyData.find(d => d.name === e.label);
                  return (
                    <div key={e.id} className="text-center space-y-1">
                      <div className="text-2xl">{e.emoji}</div>
                      <div className="text-[10px] font-bold text-slate-500">{e.label}</div>
                      <div className="text-lg font-black text-slate-800">{data?.count || 0}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <Trophy className="w-10 h-10 text-amber-500 mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase">Tổng số sao</p>
              <p className="text-4xl font-black text-slate-800">{activeStudent.totalStars} ⭐</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
              <h3 className="font-bold text-slate-800">Tần suất cảm xúc (7 ngày)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData(7, activeStudent.id)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {getChartData(7, activeStudent.id).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
              <h3 className="font-bold text-slate-800">Xu hướng 30 ngày</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getTrendData(30, activeStudent.id)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="positive" stackId="a" fill="#10b981" />
                    <Bar dataKey="difficult" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Insights & Keywords */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-500" /> Phân tích từ Bobi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {studentSummaries.length === 0 ? (
                <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 italic">
                  Chưa có đủ dữ liệu hội thoại để phân tích cho học sinh này.
                </div>
              ) : (
                studentSummaries.map(summary => (
                  <div key={summary.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">{summary.date}</span>
                      <div className="flex flex-wrap gap-2">
                        {summary.keywords.map((kw, i) => (
                          <span key={i} className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Tóm tắt AI:</p>
                      <p className="text-slate-700 leading-relaxed text-sm italic">"{summary.summary}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Daily Situations */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" /> Tình huống đã xử lý
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentSituations.length === 0 ? (
                <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 italic">
                  Chưa có tình huống nào được xử lý.
                </div>
              ) : (
                studentSituations.map(s => (
                  <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{s.date}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map(star => (
                          <Star key={star} className={`w-3 h-3 ${star <= s.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{s.situation}</p>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-xs text-slate-500 italic">Câu trả lời: "{s.userAnswer}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Journal / History */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-500" /> Nhật ký cảm xúc (Lịch sử)
            </h3>
            <div className="space-y-4">
              {studentRecords.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 italic">
                  Chưa có lịch sử cảm xúc.
                </div>
              ) : (
                studentRecords
                .sort((a, b) => {
                  const dateA = new Date(`${a.date.split('/').reverse().join('-')}T${a.time}`).getTime();
                  const dateB = new Date(`${b.date.split('/').reverse().join('-')}T${b.time}`).getTime();
                  return dateB - dateA;
                })
                .map((entry, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
                      {entry.emoji}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400">
                          {entry.date} • {entry.time}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        Cảm xúc: {entry.label}
                      </p>
                      {entry.note && <p className="text-xs text-slate-500 italic">Ghi chú: {entry.note}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      );
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 flex flex-col h-full bg-[#F8FAFC]"
      >
        <header className="bg-white border-b border-slate-200 py-6 px-6 sticky top-0 z-10 shadow-sm">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setScreen('onboarding')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-8 h-8 text-slate-500" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Theo dõi học sinh 🛡️</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Dashboard giáo viên</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setTeacherView('overview')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${teacherView === 'overview' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Tổng quan
              </button>
              <button 
                onClick={() => setTeacherView('student-list')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${teacherView === 'student-list' || teacherView === 'student-detail' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Học sinh
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-5xl mx-auto">
            {teacherView === 'overview' && renderOverview()}
            {teacherView === 'student-list' && renderStudentList()}
            {teacherView === 'student-detail' && renderStudentDetail()}
          </div>
        </main>
      </motion.div>
    );
  };

  const renderPinModal = () => (
    <AnimatePresence>
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPinModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border-4 border-[#F0F4F8]"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-[#F0F4F8] rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-[#4A5568]" />
              </div>
              
              <div>
                <h3 className="text-xl font-black text-[#5A5A40]">Xác nhận quyền truy cập</h3>
                <p className="text-sm text-[#8E8E80] mt-2">Vui lòng nhập mã PIN để tiếp tục</p>
              </div>

              <div className="w-full space-y-4">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Nhập mã PIN (Mặc định: 1234)"
                  className={`w-full px-6 py-4 bg-[#F9F9F7] border-2 rounded-2xl text-center text-2xl font-black tracking-[0.5em] focus:outline-none transition-all ${
                    pinError ? 'border-red-400 bg-red-50' : 'border-[#E5E5D5] focus:border-[#A29BFE]'
                  }`}
                  autoFocus
                />
                {pinError && (
                  <p className="text-xs font-bold text-red-500">Mã PIN không chính xác, vui lòng thử lại!</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={() => setIsPinModalOpen(false)}
                  className="py-4 bg-[#F5F5F0] text-[#8E8E80] rounded-2xl font-bold text-sm hover:bg-[#E5E5D5] transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    if (pinInput === TEACHER_PIN) {
                      setIsPinModalOpen(false);
                      setScreen('teacher-dashboard');
                    } else {
                      setPinError(true);
                      setPinInput('');
                    }
                  }}
                  className="py-4 bg-[#A29BFE] text-white rounded-2xl font-bold text-sm hover:bg-[#6C5CE7] shadow-lg transition-all active:scale-95"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="h-screen w-full flex flex-col relative overflow-hidden">
      {/* Animated Background Illustration */}
      <Background />

      <div className="flex-1 flex flex-col relative z-10 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {screen === 'onboarding' && renderOnboarding()}
          {screen === 'emotion' && renderEmotionSelection()}
          {screen === 'chat' && renderChat()}
          {screen === 'reward' && renderReward()}
          {screen === 'saved' && renderSavedAdvices()}
          {screen === 'daily-situation' && renderDailySituation()}
          {screen === 'journey' && renderJourney()}
          {screen === 'lessons' && renderLessons()}
          {screen === 'parent-connect' && renderParentConnect()}
          {screen === 'emotion-tracking' && renderEmotionTracking()}
          {screen === 'teacher-dashboard' && renderTeacherDashboard()}
        </AnimatePresence>
        {renderPinModal()}
      </div>
      
      {/* Global Footer */}
      <footer className="py-4 px-6 bg-white/40 backdrop-blur-sm border-t border-white/20 text-center space-y-1 z-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs md:text-sm font-bold text-[#5A5A40] tracking-wide">
            Gỡ rối nhẹ nhàng – lớn lên vững vàng 🌱
          </p>
          <p 
            className="text-[10px] md:text-xs text-[#8E8E80] leading-tight cursor-default select-none"
            onClick={handleTeacherAccess}
          >
            Được phát triển bởi cô Nguyễn Thị Hải Duyên - Trường Tiểu học Lê Đức Thọ
          </p>
        </div>
      </footer>

      {/* Reward Animation Overlay */}
      <AnimatePresence>
        {showStarAnimation > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
          >
            <div className="relative">
              {[...Array(showStarAnimation)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: 0, y: 0, rotate: 0 }}
                  animate={{ 
                    scale: [0, 1.5, 1],
                    x: (i - (showStarAnimation-1)/2) * 80,
                    y: -150,
                    rotate: 360
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute"
                >
                  <Star className="w-20 h-20 text-[#FFD93D] fill-[#FFD93D] drop-shadow-2xl" />
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/90 backdrop-blur-md px-8 py-4 rounded-full shadow-2xl border-4 border-[#FFD93D] mt-40"
              >
                <p className="text-3xl font-black text-[#5A5A40]">
                  +{showStarAnimation} Sao! ⭐
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safe Area Indicator for Mobile Feel */}
      <div className="h-1.5 w-32 bg-[#E5E5D5] rounded-full mx-auto mb-2 opacity-30 absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none" />
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Mobile Handle */}
              <div className="w-12 h-1.5 bg-[#E5E5D5] rounded-full mx-auto mb-6 sm:hidden" />

              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#F3E5F5] rounded-2xl flex items-center justify-center shadow-sm">
                    <Users className="w-7 h-7 text-[#A29BFE]" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-[#5A5A40] leading-tight">Chia sẻ với Ba Mẹ</h3>
                    <p className="text-[10px] sm:text-xs font-bold text-[#A29BFE] uppercase tracking-widest">Kết nối yêu thương</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-[#8E8E80]" />
                </button>
              </div>

              <p className="text-sm text-[#8E8E80] mb-6">
                Chọn cách gửi lời chia sẻ và lời khuyên của Bobi đến phụ huynh nhé.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
                {[
                  { id: 'zalo', name: isZaloMiniApp() ? 'Zalo' : 'Sao chép để gửi qua Zalo', icon: MessageCircle, color: '#0068FF', bgColor: '#E3F2FD' },
                  { id: 'messenger', name: 'Messenger', icon: MessageSquare, color: '#0084FF', bgColor: '#E1F5FE' },
                  { id: 'copy', name: 'Sao chép nội dung', icon: Copy, color: '#4CAF50', bgColor: '#E8F5E9' },
                  { id: 'link', name: 'Chia sẻ link', icon: Link, color: '#A29BFE', bgColor: '#F3E5F5' },
                ]
                .sort((a, b) => (a.id === lastShareMethod ? -1 : b.id === lastShareMethod ? 1 : 0))
                .map((option) => (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleShare(option.id)}
                    className="flex flex-col items-center gap-3 p-5 rounded-[16px] transition-all border border-transparent hover:border-[#E5E5D5] shadow-sm hover:shadow-lg bg-white"
                    style={{ backgroundColor: option.bgColor }}
                  >
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
                      style={{ backgroundColor: option.color }}
                    >
                      <option.icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="font-bold text-[#5A5A40] text-[10px] sm:text-xs text-center leading-tight">{option.name}</span>
                  </motion.button>
                ))}
              </div>

              <div className="mb-8">
                <h4 className="text-xs font-bold text-[#8E8E80] uppercase tracking-wider mb-3">Nội dung gửi ba mẹ</h4>
                <div className="bg-[#F9F9F7] border border-[#E5E5D5] rounded-2xl p-4 max-h-40 overflow-y-auto">
                  <p className="text-sm text-[#5A5A40] whitespace-pre-wrap leading-relaxed">
                    {shareData.text}
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-6 py-3 bg-[#F5F5F0] text-[#8E8E80] rounded-full font-bold text-sm hover:bg-[#E5E5D5] transition-colors"
                >
                  Đóng
                </button>
                {lastShareMethod && (
                  <button
                    onClick={() => handleShare(lastShareMethod)}
                    className="px-8 py-3 bg-[#A29BFE] text-white rounded-full font-bold text-sm hover:bg-[#6C5CE7] shadow-md transition-all active:scale-95"
                  >
                    Chia sẻ lại ({lastShareMethod === 'zalo' ? (isZaloMiniApp() ? 'Zalo' : 'Sao chép Zalo') : lastShareMethod === 'messenger' ? 'Messenger' : lastShareMethod === 'copy' ? 'Sao chép' : 'Link'})
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 bg-[#4A4A40] text-white rounded-full shadow-xl font-bold text-sm whitespace-nowrap flex items-center gap-2"
          >
            {shareToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
