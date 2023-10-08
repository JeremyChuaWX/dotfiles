return {
    s(
        "err",
        fmt(
            [[
if err != nil {{
    {}
}}
            ]],
            { i(1, "return err") }
        )
    ),
}
