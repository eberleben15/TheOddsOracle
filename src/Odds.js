
import React, {useState, Component} from "react";
import {oddsForGames} from "./App";
import {Button, Card, CardHeader, CardBody, CardTitle, CardText, Col, Container, Collapse, Input, InputGroup, InputGroupAddon, ListGroup, ListGroupItem, ModalHeader, Nav, NavItem, NavLink,
    Row, TabContent, TabPane, UncontrolledTooltip} from 'reactstrap';

export default class Odds extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            error: false,
            isActiveLeaguesOpen: false,
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
                <Row>
                    <Button onClick={() => this.toggleActiveLeagues()}>View Active Leagues</Button>
                </Row>
                <Collapse isOpen={this.state.isActiveLeaguesOpen}>
                    <ListGroup>
                        {this.state.activeLeagues.map((title) => (<ListGroupItem tag="a" onClick={() => this.getLeagueGames({title})}>{title}</ListGroupItem>))}
                    </ListGroup>
                </Collapse>
                    {this.state.games.map((game) => (
                    <Card>
                        <CardHeader>{game.teams[0]} vs {game.teams[1]}</CardHeader>
                        <CardBody>
                            <CardText>{convertOddsDecimalToAmerican(game.odds)}</CardText>
                            <Button>Place Bet</Button>
                        </CardBody>
                    </Card>
                    ))}

            </Container>
        );
    }

    toggleActiveLeagues() {
        this.setState({isActiveLeaguesOpen: !this.state.isActiveLeaguesOpen})
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
                console.log("IN THEN")
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
                console.log('Error status', error.response.status)
                console.log(error.response.data)
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
            }
        })
            .then(response => {
                console.log("IN THEN")
                console.log('Remaining requests', response.headers['x-requests-remaining'])
                console.log('Used requests', response.headers['x-requests-used'])
                console.log(response.data.data)
                let responseString = JSON.stringify(response.data.data);
                let mainObj = JSON.parse(responseString);
                let gameArray = [];
                for(let i =0; i < mainObj.length; i++) {
                    gameArray.push({
                        teams: mainObj[i].teams,
                        commence_time: mainObj[i].commence_time,
                        home_team: mainObj[i].home_team,
                        odds: mainObj[i].sites[0].odds.h2h[0]
                    })
                }
                this.setState({activeLeagues: [], leagueKeys: []})
                this.setState({games: gameArray})
                console.log(this.state.games)
                console.log(this.state.games[0].teams[0])
                console.log(this.state.games[0].odds)


            })
            .catch(error => {
                console.log('Error status', error.response.status)
                console.log(error.response.data)
            })
    }

}

function convertOddsDecimalToAmerican(decimal) {
    let moneyline;
    decimal < 2.0 ? moneyline = ((-100) / (decimal - 1)).toPrecision(3) : moneyline = ((decimal - 1) * 100).toPrecision(3);
    return moneyline;
}





        /*
            Now get a list of live & upcoming games for the sport you want, along with odds for different bookmakers
        */
//         axios.get('https://api.the-odds-api.com/v3/odds', {
//             params: {
//                 api_key: api_key,
//                 sport: sport_key,
//                 region: region,
//                 mkt: market,
//             }
//         })
//             .then(response => {
                // response.data.data contains a list of live and
                //   upcoming events and odds for different bookmakers.
                // Events are ordered by start time (live events are first)
                //console.log(JSON.stringify(response.data.data))    //response.data.data


               //this.setState({data: response.data.data});
                //console.log(this.state.data);



                // for(let j =0; j < mainObj.length; j++)
                // {
                //    for(let k =0; k < mainObj.sites.length; k++)
                //    {
                //         oddsArray += mainObj[j].sites[k];
                //           //oddsArray += mainObj[j].sites[k].odds.h2h[k + 1]+ "\n";
                //    }
                // }

                //mainObj[0].sites[0].odds.h2h[0]
                //console.log("aray " + mainObj[0].sites[0].odds.h2h[0] );
                //alert("Upcoming games:\n\n"  + scheduleArray);

                //let array = response.data.data
                //let result = array.filter((x)=>x.active === true);
                //console.log(result[0].group)


        /*
            Now get a list of live & upcoming games for the sport you want, along with odds for different bookmakers
        */
        // axios.get('https://api.the-odds-api.com/v3/odds', {
        //     params: {
        //         api_key: api_key,
        //         sport: sport_key,
        //         region: region,
        //         mkt: market,
        //     }
        // })
        //     .then(response => {
        //         // response.data.data contains a list of live and
        //         //   upcoming events and odds for different bookmakers.
        //         // Events are ordered by start time (live events are first)
        //         //console.log(JSON.stringify(response.data.data))
        //
        //         // Check your usage
        //         console.log('Remaining requests', response.headers['x-requests-remaining'])
        //         console.log('Used requests', response.headers['x-requests-used'])
        //
        //     })
        //     .catch(error => {
        //         console.log('Error status', error.response.status)
        //         console.log(error.response.data)
        //     })



//                 stuff = JSON.stringify(response.data.data);
//                 let mainObj = JSON.parse(stuff);
//                 let scheduleArray = [];
//                 let oddsArray = [];
//                     for(let i =0; i < mainObj.length; i++)
//                         scheduleArray += mainObj[i].teams + "\n";


//                      //oddsArray += mainObj[prep].sites[prep].odds.h2h[prep] + "\n";

//                      // for(let j =0; j < mainObj.length; j++)
//                      // {
//                      //    for(let k =0; k < mainObj.sites.length; k++)
//                      //    {
//                      //         oddsArray += mainObj[j].sites[k];
//                      //           //oddsArray += mainObj[j].sites[k].odds.h2h[k + 1]+ "\n";
//                      //    }
//                      // }

//                         //mainObj[0].sites[0].odds.h2h[0]
//                         //console.log("aray " + mainObj[0].sites[0].odds.h2h[0] );
//                     alert("Upcoming games:\n\n"  + scheduleArray);



//                 //console.log(showOdds());
//                 //console.log("this is show" + showOdds());
//                // console.log(JSON.stringify(response.data.data))
//                 console.log(JSON.parse(stuff));//make data into objects for manipulation
//                 // return

//                 //console.log("main " + mainObj[0].teams + " " + mainObj[0].sites[0].odds.h2h[0] + " " + mainObj[0].sites[0].odds.h2h[1]);

//                 // Check your usage
//                 // console.log('Remaining requests', response.headers['x-requests-remaining'])
//                 // console.log('Used requests', response.headers['x-requests-used'])

//             })
//             .catch(error => {
//                 console.log('Error status', error.response.status)
//                 console.log(error.response.data)
//             })

//     }


//}
//export let mainObj;

