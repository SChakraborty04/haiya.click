class ApiResponse {

    static ok(res, message, data = null){
        return res.status(200).json({
            success: true,
            message,
            data
        })
    }

    static created(res, message, data = null){
        return res.status(201).json({
            success: true,
            message,
            data
        })
    }

    static accepted(res, message, data = null){
        return res.status(202).json({
            success: true,
            message,
            data
        })
    }

    static noContent(res){
        return res.status(204).send()
    }
    static internal(res, message="Internal Server Error"){
        return res.status(500).json({
            success: false,
            message
        })
    }

    static noPermission(res, message="No Permission", data = null){
        return res.status(403).json({
            success: false,
            message,
            data
        })
    }

}



export default ApiResponse