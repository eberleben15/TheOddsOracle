import React from 'react';
import { Badge, Form, FormGroup, Input, Label } from 'reactstrap';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div class="App">
      <header class="App-header">
        <h1><Badge color="secondary">TheOddsOracle</Badge></h1>
      </header>
        <body class="App-body">
        <Form>
            <FormGroup>
                <Label for="sportSelect">Select Sport</Label>
                <Input type="select" name="select" id="sportSelect" class="SelectSports">
                    <option>MLB</option>
                    <option>NBA</option>
                    <option>NFL</option>
                    <option>PGA</option>
                    <option>MLS</option>
                </Input>
            </FormGroup>
        </Form>
        </body>
    </div>


);
}

export default App;
