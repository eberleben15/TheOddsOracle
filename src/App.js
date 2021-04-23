import React from 'react';
import Button, { Badge, Form, FormGroup, Input, Label } from 'reactstrap';
import logo from './logo.svg';
import './App.css';
import  { runOdds, showOdds } from './Odds.js';
import  { mainObj } from './Odds.js';
import Odds from './Odds.js';







 function oddsForGames()
{

     runOdds();
    // let wording = showOdds();
    // console.log(wording);
     //let obj = JSON.parse(wording);
     //console.log("this is mainobj" + obj);

//let obj = JSON.parse(Odds.state.data);
//console.log(obj);



       //let theOdds = fetch("https://api.the-odds-api.com")
    //let theOdds =stuff;

     //fetch('https://api.the-odds-api.com/v3/odds/?apiKey=03b0ed79afb3e22a0458b0f9cb51bfc3&sport=baseball_mlb&region=us&mkt=h2h')
        //.then(response => response.text())
        // .then(data => stuff = data)
        // .then(stuff => console.log(stuff));
         //.then(data => stuff = data)
         //.then(mainObj => mainObj = JSON.parse(stuff.toString()))
        //.then(data => console.log("this is stuff " + data))
         //.then(mainObj => console.log("this is mainobj " + mainObj))


 //let response = await fetch('https://api.the-odds-api.com/v3/odds/?apiKey=03b0ed79afb3e22a0458b0f9cb51bfc3&sport=baseball_mlb&region=us&mkt=h2h')
//let  data = await response.json();
// console.log("this is data: " + data);
//mainObj=JSON.parse(mainObj);
 // console.log("this is mainobj: " + mainObj);
//console.log("this is stuff " + stuff);





        //console.log("this is mainobj" + mainObj);

   //const url = "https://api.randomuser.me/";
//const response = await fetch(url);
//const data = await response.json();
  //      console.log(data.results[0].name.first);

//console.log("this is stuff " + runOdds());
//console.log("this is the odds: " + stuff);


}



function App() {



  return (




    <div class="App">
      <header class="App-header">
        <h1><Badge color="secondary">TheOddsOracle</Badge></h1>
      </header>
        <body class="App-body">
        <Form>
            <FormGroup>
                <Label for="sportSelect">Select Sport</Label><br></br>
                <Input type="select" name="select" id="sportSelect" class="Select-sports">
                    <option>MLB</option>
                    <option>NBA</option>
                    <option>NFL</option>
                    <option>NHL</option>
                    <option>PGA</option>
                    <option>MLS</option>
                </Input>

            </FormGroup>
        </Form>
        <br></br>


        <button onClick={oddsForGames}>Get The Odds</button>


        </body>

    </div>


);
}

export default App;
