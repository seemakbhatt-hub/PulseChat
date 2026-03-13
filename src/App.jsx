import { useEffect, useState, useRef } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { collection, addDoc, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { encryptMessage, decryptMessage } from "./crypto";
import "./App.css";

function App() {

const [user, setUser] = useState(null);
const [messages, setMessages] = useState([]);
const [loginTime, setLoginTime] = useState(null);
const [input, setInput] = useState("");
const [loading, setLoading] = useState(true);
const [typingUser, setTypingUser] = useState("");

const messagesEndRef = useRef(null);

// auto scroll to newest message
const scrollToBottom = () => {
messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
};

useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((u) => {
    setUser(u);

    if (u) {
      setLoginTime(new Date());
    }

    setLoading(false);
  });

  return () => unsubscribe();
}, []);
useEffect(() => {

  if (!loginTime) return;

  const q = query(
    collection(db, "messages"),
    where("createdAt", ">", loginTime),
    orderBy("createdAt")
  );

  const unsubscribe = onSnapshot(q, async (snapshot) => {

    const msgs = [];

    for (let doc of snapshot.docs) {

      const data = doc.data();
      const decrypted = await decryptMessage(data.text, data.iv);

      msgs.push({
        ...data,
        text: decrypted
      });

    }

    setMessages(msgs);
    setTimeout(scrollToBottom, 100);

  });

  return () => unsubscribe();

}, [loginTime]);
useEffect(() => {

  const q = query(collection(db, "typing"), orderBy("time"));

  const unsubscribe = onSnapshot(q, (snapshot) => {

    snapshot.docChanges().forEach((change) => {

      if (change.type === "added") {

        const name = change.doc.data().name;

        if (name !== user?.displayName) {

          setTypingUser(name);

          setTimeout(() => {
            setTypingUser("");
          }, 2000);

        }

      }

    });

  });

  return () => unsubscribe();

}, [user]);

const sendMessage = async () => {

if (!input.trim()) return;

const encrypted = await encryptMessage(input);

await addDoc(collection(db, "messages"), {
  text: encrypted.encrypted,
  iv: encrypted.iv,
  sender: user.displayName,
  createdAt: new Date()
});

setInput("");

};

const handleKeyPress = (e) => {
if (e.key === "Enter") {
sendMessage();
}
};

const login = async () => {
await signInWithPopup(auth, provider);
};

const logout = async () => {
await signOut(auth);
};

if (loading) {
return ( <div className="loading"> <h1>Initializing Secure Channel...</h1> </div>
);
}

if (!user) {
return ( <div className="login"> <h1>ShadowTalk</h1> <button onClick={login}>Enter Secure Chat</button> </div>
);
}

return ( <div className="chat-container">

  <div className="header">
    ShadowTalk By Shankari
    <button onClick={logout}>Logout</button>
  </div>

  <div className="messages">

    {messages.map((msg, i) => (

      <div
        key={i}
        className={`message ${
          msg.sender === user.displayName ? "sent" : "received"
        }`}
      >

        <div className="sender">{msg.sender}</div>
        <div className="text">{msg.text}</div>

      </div>

    ))}

    <div ref={messagesEndRef} />

  </div>

  {typingUser && (
  <div className="typing-indicator">
    {typingUser} is typing...
  </div>
)}
  <div className="input-area">

   <input
  value={input}
  onChange={(e) => {
    setInput(e.target.value);

    addDoc(collection(db, "typing"), {
      name: user.displayName,
      time: new Date()
    });
  }}
  onKeyDown={handleKeyPress}
  placeholder="Type encrypted message..."
/>
    <button onClick={sendMessage}>Send</button>

  </div>

</div>

);
}

export default App;
