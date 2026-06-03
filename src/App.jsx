App.jsx — Fixed Code for PulseChat
Replace your entire src/App.jsx with this code. Three bugs were fixed: (1) Google Sign-In now has proper error handling via
handleGoogleSignIn(), (2) The Google button's onClick now calls handleGoogleSignIn, (3) The header JSX div structure was
corrected — mismatched tags were causing the red X build failure.
import { useEffect, useState, useRef } from "react";
import { auth, provider, db } from "./firebase";
import { updateProfile } from "firebase/auth";
import { signInWithPopup, signOut, createUserWithEmailAndPassword,
  signInWithEmailAndPassword } from "firebase/auth";
import { collection, setDoc, onSnapshot, query, orderBy, where,
  deleteDoc, doc, updateDoc } from "firebase/firestore";
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
  const [typingUser, setTypingUser] = useState("");
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
  // FIX 1: Google Sign-In now has proper error handling
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      alert(err.message);
    }
  };
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        setLoginTime(new Date());
        await setDoc(doc(db, "onlineUsers", u.uid), {
          name: u.displayName || "Anonymous"
        });
        window.userDocId = u.uid;
      }
      setLoading(false);
    });
    return () => unsubscribe();
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
    const q = query(collection(db, "onlineUsers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data().name);
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
      reactions: {}
    });
    setInput("");
    await deleteDoc(doc(db, "typing", user.uid));
  };
  const reactToMessage = async (messageId, emoji) => {
    const messageRef = doc(db, "messages", messageId);
    const message = messages.find(m => m.id === messageId);
    const updatedReactions = { ...(message.reactions || {}), [emoji]: true };
    await updateDoc(messageRef, { reactions: updatedReactions });
  };
  const logout = async () => {
    if (window.userDocId) {
      await deleteDoc(doc(db, "onlineUsers", window.userDocId));
    }
    await signOut(auth);
  };
  if (loading) return (
    
Initializing Secure Channel...

  );
  if (!user) {
    return (
      

        
PulseChat

        

          {isSignup && (
             setUsername(e.target.value)}
            />
          )}
           setEmail(e.target.value)}
          />
           setPassword(e.target.value)}
          />
          
            {isSignup ? "Sign Up" : "Login"}
          
          
 setIsSignup(!isSignup)} style={{ cursor: "pointer" }}>
            {isSignup ? "Already have an account? Login" : "New user? Sign Up"}
          

          
          {/* FIX 2: Google button now calls handleGoogleSignIn */}
          
            Continue with Google
          
        

      

    );
  }
  return (
    

      {/* FIX 3: Header JSX div structure corrected */}
      

        

          
          PulseChat By Shankzz
        

        

          Logout
        

      

      

        

          Online: {onlineUsers.join(", ")}
        

        

          {messages.map((msg, index) => {
            const isMine = msg.uid === user.uid;
            const showName = index === 0 || messages[index - 1].uid !== msg.uid;
            return (
              

                {!isMine && showName && (
                  
{msg.name?.charAt(0)}

                )}
                

                  {showName && (
                    
{msg.name}

                  )}
                  

                    
{msg.text}

                    

                       reactToMessage(msg.id, "thumbs_up")}>
                        thumbs_up
                      
                       reactToMessage(msg.id, "heart")}>
                        heart
                      
                    

                  

                

              

            );
          })}
          

        

        

           setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
          />
          Send
        

}
      

    

  );
export default App;
