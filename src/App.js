import React, {Component} from 'react';
import Button, { Badge, Form, FormGroup, Input, Label } from 'reactstrap';
import './App.css';
import Odds from './Odds.js';
import Header from './Header.js';

export default class App extends Component {

  render() {
  return (
      <>
        {this.renderHeader()}
        {this.renderOdds()}
      </>
  );
  }

  renderHeader() {
    return(
        <Header/>
    )
  }

  renderOdds() {
    return(
        <Odds/>
    )
  }

}

