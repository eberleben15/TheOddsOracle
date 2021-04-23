
import React, {useState, Component} from "react";
import {oddsForGames} from "./App";
import {Button, Col, Container, Collapse, Input, InputGroup, InputGroupAddon, ListGroup, ListGroupItem, ModalHeader, Nav, NavItem, NavLink,
    Row, TabContent, TabPane, UncontrolledTooltip} from 'reactstrap';

export default class Odds extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            error: false,
            activeLeagues: [],
            data: [],
        };
    }

    render() {
        return (
            <Container>
                <Button onClick={() => this.runOdds()}>View Active Leagues</Button>
                <ListGroup>
                    {this.state.activeLeagues.map(( title, ) => (<ListGroupItem>{title}</ListGroupItem>))}
                </ListGroup>

            </Container>
        );
    }

    runOdds() {

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
                console.log(JSON.stringify(response.data.data))
                let responseString = JSON.stringify(response.data.data);
                let mainObj = JSON.parse(responseString);
                let titleArray = [];
                for(let i =0; i < mainObj.length; i++) {
                    titleArray.push({
                        title: mainObj[i].title
                    })
                }
                titleArray = [...new Set(titleArray.map(item => item.title))];
                console.log(titleArray.sort())
                this.setState({activeLeagues: titleArray})

        })
           .catch(error => {
                console.log('Error status', error.response.status)
                console.log(error.response.data)
            })


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

    }
}

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

