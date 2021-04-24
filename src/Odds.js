
import React, {useState, Component} from "react";
import {Alert, Button, Card, CardHeader, CardBody, CardTitle, CardText, Col, Container, Collapse, Input, InputGroup, InputGroupAddon, ListGroup, ListGroupItem, ModalHeader, Nav, NavItem, NavLink,
    Row, TabContent, TabPane, UncontrolledTooltip} from 'reactstrap';

export default class Odds extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            error: false,
            isActiveLeaguesOpen: false,
            selectedLeague: [],
            isGamesOpen: false,
            activeLeagues: [],
            leagueKeys: [],
            games: [],
            data: [],
        };

    }

    componentDidMount() {
        {this.getActiveLeagues()}
    }

    render() {
        return (
            <Container>
                <ListGroup>
                    {this.state.activeLeagues.map((title) => (<ListGroupItem tag="a" onClick={() => this.getLeagueGames({title})}>{title}</ListGroupItem>))}
                </ListGroup>
                {this.state.selectedLeague.map((league) => (
                    <Alert color="primary">
                        {league}
                    </Alert>
                ))}
                    {this.state.games.map((game) => (
                        <Card>
                            <CardHeader>{game.teams[0]} vs {game.teams[1]}</CardHeader>
                            <CardBody>
                                <Button color="primary">{game.teams[0]} {convertOddsDecimalToAmerican(game.odds[0])}</Button>
                                {' '}
                                <Button color="primary">{game.teams[1]} {convertOddsDecimalToAmerican(game.odds[1])}</Button>
                                <CardText>
                                    <small className="text-muted">{String(new Date(game.commence_time)).substring(0,28)}</small>
                                </CardText>
                            </CardBody>
                        </Card>
                    ))}
                <br></br>
            </Container>
        );
    }

    toggleActiveLeagues() {
        this.setState({isActiveLeaguesOpen: !this.state.isActiveLeaguesOpen})
        this.setState({games: []})
    }

    getActiveLeagues() {
        console.log("IN GETACTIVELEAGUES")
        const axios = require('axios')

        // An api key is emailed to you when you sign up to a plan
        // Get a free API key at https://api.the-odds-api.com/
        const api_key = '03b0ed79afb3e22a0458b0f9cb51bfc3'

        const sport_key = 'upcoming' // use the sport_key from the /sports endpoint below, or use 'upcoming' to see the next 8 games across all sports

        const region = 'us' // uk | us | eu | au

        const market = 'h2h' // h2h | spreads | totals

        /*
            First get a list of in-season sports
                the sport 'key' from the response can be used to get odds in the next request
        */
        axios.get('https://api.the-odds-api.com/v3/sports', {
            params: {
                api_key: api_key
            }
        })
            .then(response => {
                console.log('Remaining requests', response.headers['x-requests-remaining'])
                console.log('Used requests', response.headers['x-requests-used'])
                let responseString = JSON.stringify(response.data.data);
                let mainObj = JSON.parse(responseString);
                let titleArray = [];
                for(let i =0; i < mainObj.length; i++) {
                    titleArray.push({
                        sport_key: mainObj[i].key,
                        title: mainObj[i].title
                    })
                }
                let titleSet = [...new Set(titleArray.map(item => item.title))];
                titleSet.sort();
                this.setState({activeLeagues: titleSet, leagueKeys: titleArray})

        })
           .catch(error => {
                console.log('Error status', error.response)
                console.log(error.response)
            })
    }

    getLeagueGames(title) {
        title = title.title
        console.log(this.state.leagueKeys)
        console.log(title)
        //console.log(this.state.leagueKeys[index].sport_key)
        let key = this.state.leagueKeys.find(o => o.title === title)
        console.log(key)
        key = key.sport_key
        console.log(key)
        console.log("IN GETLEAGUEGAMES")
        const axios = require('axios')

        // An api key is emailed to you when you sign up to a plan
        // Get a free API key at https://api.the-odds-api.com/
        const api_key = '03b0ed79afb3e22a0458b0f9cb51bfc3'

        const region = 'us' // uk | us | eu | au

        const market = 'h2h' // h2h | spreads | totals

        const dateFormat = 'iso' //unix or iso



        /*
            First get a list of in-season sports
                the sport 'key' from the response can be used to get odds in the next request
        */
        axios.get('https://api.the-odds-api.com/v3/odds', {
            params: {
                api_key: api_key,
                sport: key,
                region: region,
                mkt: market,
                dateFormat: dateFormat
            }
        })
            .then(response => {
                console.log('Remaining requests', response.headers['x-requests-remaining'])
                console.log('Used requests', response.headers['x-requests-used'])
                console.log(response.data.data)
                let responseString = JSON.stringify(response.data.data);
                let mainObj = JSON.parse(responseString);
                let gameArray = [];
                let selectedLeagueArray = []
                for(let i =0; i < mainObj.length; i++) {
                    gameArray.push({
                        teams: mainObj[i].teams,
                        commence_time: mainObj[i].commence_time,
                        home_team: mainObj[i].home_team,
                        odds: mainObj[i].sites[0].odds.h2h,
                        sport_nice: mainObj[i].sport_nice
                    })
                }
                selectedLeagueArray.push(gameArray[0].sport_nice)
                this.setState({activeLeagues: [], leagueKeys: []})
                this.setState({games: gameArray, selectedLeague: selectedLeagueArray})
                console.log(this.state.games)
                console.log(this.state.games[0].teams[0])
                console.log(this.state.games[0].odds)


            })
            .catch(error => {
                console.log('Error status', error.response)
                console.log(error.response)
            })
    }

}

function convertOddsDecimalToAmerican(decimal) {
    let moneyline;
    decimal < 2.0 ? moneyline = ((-100) / (decimal - 1)).toPrecision(3) : moneyline = ((decimal - 1) * 100).toPrecision(3);
    return moneyline;
}

