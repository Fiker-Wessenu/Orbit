import React,{useState} from 'react';


import {
View,
Text,
TextInput,
Button,
Alert
} from 'react-native';


import auth from '@react-native-firebase/auth';



export default function LoginScreen(){


const [email,setEmail]=useState("");

const [password,setPassword]=useState("");



const login = async()=>{


try{


const result =
await auth()
.signInWithEmailAndPassword(
email,
password
);



if(!result.user.emailVerified){

Alert.alert(
"Verify Email",
"Please verify your email first"
);

return;

}


Alert.alert(
"Success",
"Login successful"
);



}

catch(error){

Alert.alert(
"Error",
error.message
);

}


};



return(

<View>


<Text>
OrbitChat Login
</Text>



<TextInput

placeholder="Email"

onChangeText={setEmail}

/>



<TextInput

placeholder="Password"

secureTextEntry

onChangeText={setPassword}

/>



<Button

title="Login"

onPress={login}

/>


</View>

);


}import React,{useState} from 'react';


import {
View,
Text,
TextInput,
Button,
Alert
} from 'react-native';


import auth from '@react-native-firebase/auth';



export default function LoginScreen(){


const [email,setEmail]=useState("");

const [password,setPassword]=useState("");



const login = async()=>{


try{


const result =
await auth()
.signInWithEmailAndPassword(
email,
password
);



if(!result.user.emailVerified){

Alert.alert(
"Verify Email",
"Please verify your email first"
);

return;

}


Alert.alert(
"Success",
"Login successful"
);



}

catch(error){

Alert.alert(
"Error",
error.message
);

}


};



return(

<View>


<Text>
OrbitChat Login
</Text>



<TextInput

placeholder="Email"

onChangeText={setEmail}

/>



<TextInput

placeholder="Password"

secureTextEntry

onChangeText={setPassword}

/>



<Button

title="Login"

onPress={login}

/>


</View>

);


}