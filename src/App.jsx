import { useEffect, useState, useRef } from "react";
import { auth, provider, db } from "./firebase";
import { updateProfile } from "firebase/auth";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import {
  collection, setDoc, onSnapshot, query, orderBy,
  where, deleteDoc, doc, updateDoc
} from "firebase/firestore";
import { encryptMessage, decryptMessage } from "./crypto";
import "./App.css";
import logo from "./mylogo.png";

function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [loginTime, setLoginTime] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAuth = async () => {
    try {
      if (isSignup && !username.trim()) {
        alert("Username required");
        return;
      }
      if (isSignup) {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: username });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Try popup first — if browser blocks it, fall back to redirect
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
          alert(redirectErr.message);
        }
      } else {
        alert(err.message);
      }
    }
  };

  // Single clean useEffect for auth — handles BOTH popup and redirect sign-in
  useEffect(() => {
    let unsubscribeAuth = null;

    const initAuth = async () => {
      // Check if user is returning from a Google redirect
      try {
        await getRedirectResult(auth);
        // If redirect happened, onAuthStateChanged below will pick up the user automatically
      } catch (err) {
        console.error("Redirect result error:", err.message);
      }

      // Now listen for auth state — this handles popup, redirect, and email login
      unsubscribeAuth = auth.onAuthStateChanged(async (u) => {
        if (u) {
          setUser(u);
          setLoginTime(new Date());
          await setDoc(doc(db, "onlineUsers", u.uid), {
            name: u.displayName || "Anonymous",
          });
          window.userDocId = u.uid;
        } else {
          setUser(null);
          setLoginTime(null);
        }
        setLoading(false);
      });
    };

    initAuth();

    // Proper cleanup — this actually runs when component unmounts
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!loginTime || !user) return;
    const q = query(
      collection(db, "messages"),
      where("createdAt", ">", loginTime),
      orderBy("createdAt")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = [];
      for (let messageDoc of snapshot.docs) {
        const data = messageDoc.data();
        const decrypted = await decryptMessage(data.text, data.iv);
        msgs.push({ id: messageDoc.id, ...data, text: decrypted });
      }
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });
    return () => unsubscribe();
  }, [loginTime, user]);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "onlineUsers")), (snapshot) => {
      const users = snapshot.docs.map((d) => d.data().name);
      setOnlineUsers(users);
    });
    return () => unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const encrypted = await encryptMessage(input);
    await setDoc(doc(collection(db, "messages")), {
      text: encrypted.encrypted,
      iv: encrypted.iv,
      name: user.displayName,
      uid: user.uid,
      createdAt: new Date(),
      seen: false,
      reactions: {},
    });
    setInput("");
    await deleteDoc(doc(db, "typing", user.uid));
  };

  const reactToMessage = async (messageId, emoji) => {
    const messageRef = doc(db, "messages", messageId);
    const message = messages.find((m) => m.id === messageId);
    const updatedReactions = { ...(message.reactions || {}), [emoji]: true };
    await updateDoc(messageRef, { reactions: updatedReactions });
  };

  const logout = async () => {
    if (window.userDocId) {
      await deleteDoc(doc(db, "onlineUsers", window.userDocId));
    }
    await signOut(auth);
    setUser(null);
    setMessages([]);
    setLoginTime(null);
  };

  if (loading) {
    return (
      <div className="loading">
        <h1>Initializing Secure Channel...</h1>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login">
        <h1 className="gradient-title">PulseChat</h1>
        <div className="login-box">
          {isSignup && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleAuth} className="gradient-btn">
            {isSignup ? "Sign Up" : "Login"}
          </button>
          <p onClick={() => setIsSignup(!isSignup)} style={{ cursor: "pointer" }}>
            {isSignup ? "Already have an account? Login" : "New user? Sign Up"}
          </p>
          <hr />
          <button onClick={handleGoogleSignIn} className="gradient-btn">
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="header">
        <div className="logo-title">
          <img src={logo} className="logo" alt="logo" />
          <span className="gradient-title">PulseChat By Shankzz</span>
        </div>
        <div className="header-buttons">
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="chat-content">
        <div className="online-users">Online: {onlineUsers.join(", ")}</div>

        <div className="messages">
          {messages.map((msg, index) => {
            const isMine = msg.uid === user.uid;
            const showName = index === 0 || messages[index - 1].uid !== msg.uid;
            return (
              <div
                key={msg.id}
                className={`message-row ${isMine ? "sent" : "received"}`}
              >
                {!isMine && showName && (
                  <div className="avatar">{msg.name?.charAt(0)}</div>
                )}
                <div className="message-content">
                  {showName && <div className="message-name">{msg.name}</div>}
                  <div className="message-bubble">
                    <div className="message-text">{msg.text}</div>
                    <div className="reactions">
                      <button onClick={() => reactToMessage(msg.id, "👍")}>👍</button>
                      <button onClick={() => reactToMessage(msg.id, "❤️")}>❤️</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="The Floor Is Yours to Type..."
          />
          <button className="gradient-btn" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;


