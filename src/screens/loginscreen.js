import React,{useState} from 'react';


import {
View,
Text,
TextInput,
Button,
Alert,
TouchableOpacity,
StyleSheet
} from 'react-native';


import auth from '@react-native-firebase/auth';



export default function LoginScreen({ navigation }){


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

<View style={styles.container}>


<Text style={styles.title}>
OrbitChat Login
</Text>



<TextInput

style={styles.input}

placeholder="Email"

onChangeText={setEmail}

autoCapitalize="none"

/>



<TextInput

style={styles.input}

placeholder="Password"

secureTextEntry

onChangeText={setPassword}

/>



<Button

title="Login"

onPress={login}

/>


<TouchableOpacity onPress={() => navigation.navigate('Register')}>

<Text style={styles.link}>
Don't have an account? Create one
</Text>

</TouchableOpacity>


</View>

);


}


const styles = StyleSheet.create({

container:{
flex:1,
justifyContent:'center',
padding:20
},

title:{
fontSize:24,
textAlign:'center',
marginBottom:30
},

input:{
borderWidth:1,
padding:10,
marginBottom:15,
borderRadius:5
},

link:{
marginTop:20,
textAlign:'center',
color:'#2f81f7'
}

});