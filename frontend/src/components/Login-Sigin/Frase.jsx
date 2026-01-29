const Frase = ({ frase, imagen }) => {
    return (
        <div className="flex flex-col">
            <header className="text-blue-600">Next</header>
            <h1>{ frase }</h1>
            <img src={imagen} alt="imagen de empleo"/>
        </div>
    )
}

export default Frase