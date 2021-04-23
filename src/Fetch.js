import React, { Component } from "react";

class Fetch extends Component {
    state = {
        loading: true,
        error: false,
        data: [],
    };

    componentDidMount() {
        fetch(this.props.url)
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
        return this.props.children(this.state);
    }
}

const Loading = () => <p>Loading</p>;

const Error = error => <p>Oops! Something went wrong: {error}</p>

const List = ({ items, renderItem }) => (
    <ul>
        {items.map(item => <li key={item.id}>{renderItem(item)}</li>)}
    </ul>
);

const DataList = () => (
    <Fetch url="/mock-data">
        {({ loading, error, data }) => (
            <>
                { loading && <Loading /> }
                { error && <Error error={error} />}
                { data.length && <List items={data} renderItem={item => item.label} /> }
            </>
        )}
    </Fetch>
);