import { useState, useEffect, useRef, useMemo } from "react";
import { SendOutlined } from "@ant-design/icons";
import WTETTF from "@/config/WhetherToEnableTheTestingFeature";
import emitter from "@/utils/eventEmittere";
import { SomeComponent } from "@/utils/m";
/* ---------- 消息类型 ---------- */
interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  typing: boolean;
  typingDone: boolean;
  thinking?: boolean;
}

/* ---------- 打字机文本单段实现（内部组件，每次重跑时父组件切 key 强制重挂载） ---------- */
function TypewriterRun({
  full,
  onDone,
}: {
  full: string;
  onDone?: () => void;
}) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  // 每字 20ms；因为挂载时就是一段新的打字过程，interval 内部每 tick 异步 setState 符合规范
  useEffect(() => {
    let cancelled = false;
    let i = 0;
    if (!full) {
      // 空文本：用 micro-task 异步标记完成（避免同步 setState 级联重渲染）
      queueMicrotask(() => {
        if (!cancelled) setDone(true);
      });
      return;
    }
    const id = window.setInterval(() => {
      i++;
      if (cancelled) return;
      setText(full.slice(0, i));
      if (i >= full.length) {
        window.clearInterval(id);
        window.setTimeout(() => {
          if (cancelled) return;
          setDone(true);
        }, 500);
      }
    }, 20);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [full]);

  useEffect(() => {
    if (done && onDone) onDone();
  }, [done, onDone]);

  return (
    <span>
      {text}
      {!done && <span className="anime-caret">|</span>}
    </span>
  );
}

/* ---------- 打字机文本组件：外部每次改变 runKey，内部用 React key 机制重新挂载 TypewriterRun ---------- */
function TypewriterText({
  full,
  runKey,
  onDone,
}: {
  full: string;
  runKey: number;
  onDone?: () => void;
}) {
  return <TypewriterRun key={runKey} full={full} onDone={onDone} />;
}

/* ---------- 快捷话题 & Mock 回复 ---------- */
const QUICK_TOPICS = [
  "推荐近期番剧",
  "帮我写一段同人剧情",
  "推荐一个 Steam 游戏",
  "求一首 OP/ED 歌单",
  "这个角色是谁？",
  "帮我分析动漫剧情",
  "推荐 5 本轻小说",
  "生成一张封面配色",
];

function mockReply(userText: string): string {
  switch (userText) {
    case "推荐近期番剧":
      return `好的！为你整理近期值得追的番剧推荐 ✨\n\n🎬 1.《葬送的芙莉莲》第2季\n治愈与冒险并存，每一帧都是壁纸级画面。\n\n🎬 2.《药屋少女的呢喃》\n古风推理+宫斗，猫猫超可爱！\n\n🎬 3.《我推的孩子》续篇\n偶像悬疑大戏继续展开。\n\n🎬 4.《迷宫饭》\n奇幻美食番，脑洞大开超下饭！`;
    case "帮我写一段同人剧情":
      return `好耶！给你一段校园向同人小剧场 🌸\n\n—— 夕阳的教室，只剩他和她两人。\n「那个……你有喜欢的人吗？」她攥着书包带，声音细如蚊蚋。\n少年怔了一下，随即轻笑，指尖轻轻敲了敲她的额头：\n「笨蛋，我以为我表现得已经够明显了。」\n窗外的樱花恰好落在两人之间，世界仿佛只剩下彼此的心跳声。\n\n—— 未完待续 (๑•̀ㅂ•́)و✧`;
    case "推荐一个 Steam 游戏":
      return `推荐你这款宝藏独立游戏 🎮\n\n《Baldur's Gate 3》（博德之门3）\n\n🌟 好评如潮：96% 好评（超过 50 万评测）\n🎯 类型：CRPG · 回合制 · 单人/多人\n💫 亮点：\n  · 自由度拉满，每个选择都会影响剧情\n  · 角色塑造立体，同伴互动超有趣\n  · 170+ 小时游戏时长，二周目体验完全不同\n  · 支持联机，和朋友一起冒险更有梗\n\n价格稍贵但绝对值回票价，强推！`;
    case "求一首 OP/ED 歌单":
      return `为你精选一份 ACG 歌单 🎵 戴上耳机享受吧～\n\n🎶 1. 「紅蓮華」- LiSA（《鬼灭之刃》OP）\n🎶 2. 「unravel」- TK from 凛冽时雨（《东京喰种》OP）\n🎶 3. 「光るとき」- 羊文学（《葬送的芙莉莲》OP）\n🎶 4. 「アイドル」- YOASOBI（《我推的孩子》OP）\n🎶 5. 「残機」- ZUTOMAYO（《电锯人》ED2）\n🎶 6. 「夜に駆ける」- YOASOBI（《动物狂想曲》OP）\n🎶 7. 「ヒバナ」- DECO*27（《Spy × Family》ED）\n\n建议去 B 站或者网易云搜歌单收藏哦！`;
    case "这个角色是谁？":
      return `请把角色的图片或者更多描述发给我呀～ 👀\n\n不过你可以试试这样描述：\n· 发色 / 瞳色 / 发型\n· 穿着的服装风格\n· 大概的性格特征\n· 你是在哪部作品里看到的\n\n有了这些线索我就能帮你精准识别啦！如果是知名角色，你也可以说下大致的剧情线索～`;
    case "帮我分析动漫剧情":
      return `好的！来跟我聊聊你想分析哪部作品吧 🧐\n\n我可以帮你：\n🔍 梳理剧情时间线\n💡 分析角色动机与成长弧线\n🎭 解读作品的主题与隐喻\n🔮 推测后续剧情走向\n💭 讨论结局留下的未解之谜\n\n直接告诉我作品名 + 你想讨论的具体部分（第N话/某段剧情/某个角色）就可以开始啦！`;
    case "推荐 5 本轻小说":
      return `为你精选 5 本不同风格的优质轻小说 📚\n\n1. 《无职转生 ~到了异世界就拿出真本事~》\n   异世界转生天花板，成长描写细腻真挚。\n\n2. 《青春猪头少年不会梦到兔女郎学姐》\n   校园奇幻 + 青春群像，伏笔回收堪称神级。\n\n3. 《关于我转生变成史莱姆这档事》\n   轻松向异世界，萌王的建国物语超有趣！\n\n4. 《狼与香辛料》\n   旅行+经济学+奇幻，赫萝真的太可爱啦～\n\n5. 《Re:从零开始的异世界生活》\n   轮回系巅峰，486 的挣扎让人泪目。\n\n喜欢哪个类型的？我再给你多推荐几本！`;
    case "生成一张封面配色":
      return `好哒！为你生成一套治愈系封面配色方案 🎨\n\n🌸 方案名：「樱花与晴空」\n\n  主背景色：#FFE4EC（淡樱粉）\n  辅助渐变色：#C4D4FF → #FFC4E0\n  标题文字色：#7A6BFF（紫蓝主色）\n  正文文字色：#5A5A78\n  点缀高光色：#FF9EC7 + #8EC5FF\n\n✨ 配色意象：\n  樱花花瓣飘落，与清晨的淡蓝天空交织，\n  少女的裙摆与远处的云朵相映成画。\n\n这套配色适合校园 / 治愈 / 恋爱类封面哦～`;
    default:
      return `嗯嗯，收到你的消息啦～ 😊\n\n你说的「${userText}」很有意思呢！\n不过我现在还只是个小 Demo 版本，很多知识正在学习中……\n\n如果你想聊聊 ACG 相关的话题，试试点击上面的快捷话题按钮吧，我准备了不少有趣的内容！\n\n可以问我：\n  · 最近有什么好看的番？\n  · 推荐点轻小说/游戏？\n  · 帮你想同人文的点子？\n\n随时恭候哦 ✨`;
  }
}

/* 生成一个唯一 id：用 useMemo 预先分配自增序列避免在事件里直接调用 Date.now/Math.random（纯函数 lint 限制） */
let __idSeq = 0;
const nextLocalId = () => {
  __idSeq += 1;
  return `m-${Date.now().toString(36)}-${__idSeq.toString(36)}`;
};

/* ---------- 主组件 ---------- */
function ChatRooms() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      text: "你好！我是 ACG Hub 的专属 AI 小助手 ✨，想聊点什么？",
      typing: false,
      typingDone: true,
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 每条 AI 消息独立的打字机 runKey：消息 id → number，每开始一段新打字就递增
  const [typewriterKeys, setTypewriterKeys] = useState<Record<string, number>>(
    {},
  );

  /* 自动滚动到底部 */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* 预计算的随机延迟范围：在事件中直接取缓存值，避免在发送时调用 Math.random/Date.now */
  const delays = useMemo(() => [620, 660, 700, 730, 760, 790], []);
  const delayIdxRef = useRef(0);

  /* 发送消息 */
  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const uid1 = nextLocalId();
    const uid2 = nextLocalId();
    const userMsg: ChatMessage = {
      id: uid1,
      role: "user",
      text: trimmed,
      typing: false,
      typingDone: true,
    };
    const thinkingMsg: ChatMessage = {
      id: uid2,
      role: "ai",
      text: "",
      typing: false,
      typingDone: false,
      thinking: true,
    };
    setMessages((prev) => [...prev, userMsg, thinkingMsg]);
    setInput("");

    const delay = delays[delayIdxRef.current % delays.length];
    delayIdxRef.current += 1;
    const replyText = mockReply(trimmed);
    // 600-800ms 后开始打字机回复
    window.setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingMsg.id
            ? {
                ...m,
                text: replyText,
                thinking: false,
                typing: true,
                typingDone: false,
              }
            : m,
        ),
      );
      // 触发 TypewriterText 重新开始
      setTypewriterKeys((prev) => ({
        ...prev,
        [thinkingMsg.id]: (prev[thinkingMsg.id] ?? 0) + 1,
      }));
    }, delay);
  };

  /* 打字完成回调 */
  const handleTypingDone = (id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, typing: false, typingDone: true } : m,
      ),
    );
  };

  return (
    <>
      <div className="chat-room-wrap">
        {/* 页头标题 */}
        <div className="chat-header anime-fade-up">
          <h1>🤖 AI 聊天小屋</h1>
          <p>任何关于 ACG 的问题都可以问我～</p>
        </div>

        {/* 快捷话题 */}
        <div className="chat-quick-wrap">
          {QUICK_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              className="chat-quick-pill"
              onClick={() => sendMessage(topic)}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* 消息列表 */}
        <div className="chat-body" ref={scrollRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-msg-row ${msg.role} anime-bubble-in`}
            >
              <div
                className={`chat-bubble ${msg.role} ${msg.thinking ? "thinking" : ""}`}
              >
                {msg.thinking ? (
                  <span>
                    AI 正在思考
                    <span className="chat-thinking-dot" />
                    <span className="chat-thinking-dot" />
                    <span className="chat-thinking-dot" />
                  </span>
                ) : msg.role === "ai" && msg.typing ? (
                  <TypewriterText
                    full={msg.text}
                    runKey={typewriterKeys[msg.id] ?? 0}
                    onDone={() => handleTypingDone(msg.id)}
                  />
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 输入区 */}
        <form
          className="chat-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
        >
          <input
            className="chat-input"
            placeholder="输入消息，回车发送～"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="chat-send-btn">
            <SendOutlined />
            <span>发送</span>
          </button>
        </form>
      </div>
    </>
  );
}

export default function ChatRoom() {
  SomeComponent();
  useEffect(() => {
    if (WTETTF.chat === false) {
      emitter.emit("LOG", "");
    }
  }, []);

  if (WTETTF.chat === false) {
    return <div></div>;
  } else {
    return <ChatRooms />;
  }
}
