import React, { Component } from "react";

class DataList extends Component {
    state = {
        loading: true,
        error: false,
        data: [],
    };

    componentDidMount() {
        fetch("/mock-data")
            .then(res => {
                if (!res.ok) {
                    throw new Error(res.status);
                }
                return res.json();
            })
            .then(data => this.setState({ loading: false, data }))
            .catch(error => this.setState({ loading: false, error }));
    }

    render() {
        const { loading, error, data } = this.state;

        if (loading) {
            return <p>Loading...</p>;
        }

        if (error) {
            return <p>Oops! Something went wrong: {error}</p>;
        }

        return (
            <ul>
                {data.map(item => <li key={item.id}>{item.label}</li>)}
            </ul>
        );
    }
}