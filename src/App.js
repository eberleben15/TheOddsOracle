import React from 'react';
import Button, { Badge, Form, FormGroup, Input, Label } from 'reactstrap';
import logo from './logo.svg';
import './App.css';
import  { runOdds } from './Odds.js';




function oddsForGames()
{

let theOdds = runOdds();

//const url = "https://api.randomuser.me/";
//const response = await fetch(url);
//const data = await response.json();
  //      console.log(data.results[0].name.first);
  //  alert(data.results[0].name.first + data.results[0].name.last );
console.log(theOdds);




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
        <button onClick={oddsForGames}>Get the Odds</button>

        </body>
    </div>


);
}

export default App;
