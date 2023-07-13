import axios from "axios"
export const update = (links,link_spreads, data_matrix) => {
    return axios({
        url: 'api/update',
        method: "POST",
        data: {
            links,
            data_matrix,
            link_spreads,
            n_samples: data_matrix.length,
            input_dims: data_matrix[0].length,
            epoch_nums: 400,
            n_neighbors: 15,
            alpha: 5,
            split_upper: 0.11,
            split_lower: 0.01,
            finetune_epochs: 30,
            ml_strength: 0.3,
            cl_strength: 0.3,
        }
    })
}